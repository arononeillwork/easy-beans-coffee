/**
 * One-time setup for reading the café's own Google reviews.
 *
 *   npm run auth:google-business
 *
 * Walks the OAuth consent as an owner of the Business Profile, then prints the
 * three environment variables the site needs. Run it once; the refresh token it
 * prints does not expire on its own, so this is not part of any deploy.
 *
 * Prerequisites, in order — the first is the slow one:
 *
 *  1. The Cloud project is **approved** for the Business Profile APIs. Access
 *     is requested through Google's form and reviewed in about 14 days. Check
 *     the project's quota: 0 QPM means not approved yet, 300 QPM means it is.
 *  2. "Google My Business API" and "My Business Account Management API" are
 *     enabled in that project.
 *  3. An OAuth client of type **Web application** exists, with
 *     `http://localhost:5858/oauth2callback` listed as an authorised redirect
 *     URI, and its id/secret are in `.env.local` as GOOGLE_BUSINESS_CLIENT_ID
 *     and GOOGLE_BUSINESS_CLIENT_SECRET.
 *
 * Step 1 gates only the reviews call at the end; the consent itself works
 * without it, so an unapproved project still gets as far as printing a refresh
 * token and then fails listing accounts. That is the expected shape of "not
 * approved yet", not a bug in this script.
 *
 * See docs/google-reviews-setup.md.
 */
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

loadEnvFiles(['.env.local', '.env']);

const PORT = 5858;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = 'https://www.googleapis.com/auth/business.manage';

const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    'GOOGLE_BUSINESS_CLIENT_ID and GOOGLE_BUSINESS_CLIENT_SECRET must be set in .env.local.\n' +
      'Create an OAuth client of type "Web application" in the Google Cloud console,\n' +
      `and add ${REDIRECT_URI} to its authorised redirect URIs.`,
  );
  process.exit(1);
}

/** Guards against a stray request to the callback port landing mid-flow. */
const state = randomBytes(16).toString('hex');

const consentUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    // `offline` is what makes Google issue a refresh token at all, and
    // `consent` forces a fresh one even if this account already approved the
    // client — without it a second run gets an access token and nothing else.
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

async function exchangeCode(code: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const body = (await res.json()) as { refresh_token?: string; error_description?: string };
  if (!res.ok || !body.refresh_token) {
    throw new Error(`Token exchange failed: ${body.error_description ?? res.status}`);
  }
  return body.refresh_token;
}

async function accessTokenFrom(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`Refresh failed: ${body.error_description ?? res.status}`);
  }
  return body.access_token;
}

type Account = { name?: string; accountName?: string };
type Location = { name?: string; title?: string; storefrontAddress?: { addressLines?: string[] } };

/**
 * Prints every location this account can manage, so the right resource name can
 * be copied. Accounts and locations moved to v1 hosts; only reviews stayed on
 * v4, which is why the site and this script talk to different hosts.
 */
async function listLocations(token: string): Promise<void> {
  const headers = { Authorization: `Bearer ${token}` };

  const accountsRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers },
  );
  if (!accountsRes.ok) {
    const detail = await accountsRes.text();
    throw new Error(
      `Listing accounts responded ${accountsRes.status}.\n` +
        (accountsRes.status === 403
          ? 'A 403 here almost always means the project is not approved for the\n' +
            'Business Profile APIs yet, or the APIs are not enabled on it.\n' +
            'The refresh token above is still good — re-run once approval lands.\n'
          : '') +
        detail.slice(0, 400),
    );
  }
  const { accounts = [] } = (await accountsRes.json()) as { accounts?: Account[] };
  if (accounts.length === 0) {
    console.log('No Business Profile accounts on this Google account.');
    return;
  }

  for (const account of accounts) {
    if (!account.name) continue;
    console.log(`\n  ${account.accountName ?? account.name} (${account.name})`);

    const url =
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations` +
      `?readMask=name,title,storefrontAddress&pageSize=100`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.log(`    could not list locations (${res.status})`);
      continue;
    }
    const { locations = [] } = (await res.json()) as { locations?: Location[] };
    if (locations.length === 0) console.log('    no locations');

    for (const location of locations) {
      const street = location.storefrontAddress?.addressLines?.join(', ') ?? '';
      console.log(`    ${location.title ?? '(untitled)'}${street ? ` — ${street}` : ''}`);
      console.log(`      GOOGLE_BUSINESS_LOCATION=${account.name}/${location.name}`);
    }
  }
}

/** Resolves with the `code` query parameter once Google redirects back. */
function awaitCallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
      if (url.pathname !== '/oauth2callback') {
        res.writeHead(404).end();
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const returnedState = url.searchParams.get('state');

      const done = (message: string) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<!doctype html><meta charset="utf-8"><title>Easy Beans</title>` +
            `<body style="font-family:system-ui;padding:3rem;max-width:32rem">` +
            `<h1 style="font-size:1.25rem">${message}</h1>` +
            `<p style="color:#666">You can close this tab and return to the terminal.</p>`,
        );
        server.close();
      };

      if (error) {
        done('Consent was declined.');
        reject(new Error(`Consent declined: ${error}`));
      } else if (returnedState !== state) {
        done('State mismatch — nothing was saved.');
        reject(new Error('State mismatch on the OAuth callback.'));
      } else if (!code) {
        done('No authorisation code came back.');
        reject(new Error('No authorisation code on the callback.'));
      } else {
        done('Connected. ✓');
        resolve(code);
      }
    });

    server.on('error', reject);
    server.listen(PORT);
  });
}

async function main(): Promise<void> {
  console.log('\nOpen this URL, signed in as an owner of the Easy Beans Business Profile:\n');
  console.log(`  ${consentUrl}\n`);
  console.log(`Waiting for the redirect back to localhost:${PORT}…`);

  const code = await awaitCallback();
  const refreshToken = await exchangeCode(code);

  console.log('\n─── Add these to .env.local and to the Vercel project ───\n');
  console.log(`GOOGLE_BUSINESS_CLIENT_ID=${clientId}`);
  console.log('GOOGLE_BUSINESS_CLIENT_SECRET=(the one already in your .env.local)');
  console.log(`GOOGLE_BUSINESS_REFRESH_TOKEN=${refreshToken}`);
  console.log('\n─── Locations this account manages ───');

  await listLocations(await accessTokenFrom(refreshToken));

  console.log('\nCopy the GOOGLE_BUSINESS_LOCATION line for the Easy Beans location.\n');
}

/** Local copy, as in `seed-square-catalog.ts` — a setup script should not drag
 *  the Supabase client in behind it just to read a `.env` line. */
function loadEnvFiles(files: string[]): void {
  for (const file of files) {
    try {
      const content = readFileSync(path.resolve(process.cwd(), file), 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (match && process.env[match[1]] === undefined) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // File absent — fine.
    }
  }
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
