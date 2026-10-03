# Customer accounts

Who does what:

- **Supabase Auth** owns sign-in: email + password, "Continue with Google",
  confirmation emails, password resets. It generates, sends, expires and
  verifies every code and link — none of that lives in this codebase, and
  there are no auth tables of ours (the old `auth_codes` draft is gone).
- **Square's Customer Directory** owns the profile: name, phone, birthday,
  address, plus the seller-defined custom fields (see below). The site never
  keeps a second copy.
- The link between the two is the Square customer id stored in the Supabase
  user's `app_metadata.square_customer_id`, made lazily on the first
  authenticated request (`src/server/account/identity.ts`) and self-healing
  if the profile is deleted or merged in the Square Dashboard.

Flow: sign-up → Supabase emails a confirmation link → `/auth/callback` trades
it for a session cookie → the first `/api/account` read finds-or-creates the
Square customer (by exact email, oldest profile wins) and stamps the custom
fields. Google sign-in follows the same callback path without the email hop.

## Square custom fields

The Directory's seller-defined custom fields are discovered **by name** at
runtime (`src/server/square/customerAttributes.ts`) — their keys and option
ids are account-generated UUIDs, so nothing is hard-coded:

| Field | Type | Used how |
| --- | --- | --- |
| `Lead Source` | selection | Set to **Website** on customers the site creates |
| `Created On` | date | Set to the café-timezone date on creation |

Renaming a field in the Dashboard detaches it here (the stamp is simply
skipped); the `Interests` field exists in the Directory but the site does not
read or write it.

## One-time Supabase setup (dashboard, project `hvjtyzcxmstijbakkqxv`)

1. **Auth → URL Configuration**
   - Site URL: the production origin (e.g. `https://easybeans.example`).
   - Redirect URLs: add `https://<prod-origin>/auth/callback` and
     `http://localhost:3000/auth/callback`.
2. **Auth → Providers → Email**: leave "Confirm email" on (default).
3. **Auth → Providers → Google** (for "Continue with Google"):
   - Create an OAuth client in Google Cloud Console (type "Web application")
     with authorised redirect URI
     `https://hvjtyzcxmstijbakkqxv.supabase.co/auth/v1/callback`.
   - Paste the client id + secret into the Google provider form and enable it.
   - Until this is done the Google button shows a friendly error; email +
     password works regardless.
4. **Auth → Emails (optional but recommended for launch)**: point Supabase at
   the café SMTP account once it exists. The built-in sender works for testing
   but is rate-limited (a handful of emails per hour).

## Environment

No new variables. Accounts switch on when the three existing Supabase vars
are set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`); missing any of them, every account route answers
503 and the rest of the site is unaffected. `AUTH_SESSION_SECRET` from the
earlier passwordless draft is not used any more and can be deleted.

## GDPR

The account page is the self-service surface: GET is access, PUT is
rectification, DELETE is erasure. Deletion removes the Square customer, the
newsletter rows (`email_signups`) and the Supabase Auth user in one action;
paid orders stay, as accounting records.
