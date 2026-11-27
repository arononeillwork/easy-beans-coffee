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

## Orders need an account

Collection orders can only be placed signed in:

- `/api/checkout` answers `401 sign_in_required` without a session, and `503`
  when accounts aren't configured (no account, no online order).
- The order is stored with `orders.auth_user_id` (the Supabase user) and
  `orders.square_customer_id`, and the Square order is attached to that
  customer (`order.customerId`), so the till sees it on their profile. The
  receipt goes to the verified sign-in email — the cart no longer asks for one.
- The cart shows a sign-in prompt to signed-out visitors. Its button goes to
  `/account?next=<this page>?cart=open`; after sign-in (password, Google, or
  the confirmation email link) the visitor lands back with the cart open.
  The cart itself lives in the browser, so nothing is lost on the way.
- `/api/account/orders` lists the customer's orders (newest 20) on the account
  page, each linking to its live status page.

Needs migration `0013_orders_account.sql` (adds the two columns + index).
Orders placed before it have no owner and don't appear on any account.

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
paid orders stay, as accounting records — the `auth_user_id` foreign key is
`on delete set null`, so they are unlinked from the deleted account.

## No loyalty points

The account page shows no Square Loyalty points or rewards: the café doesn't offer them on the website.

## The coffee club pass

When the café runs a coffee club in the Business Agent (a monthly membership on Square, worth free coffees a
week), the account page shows it first:

- **A member** gets their pass to hold up at the counter: their name, large, so the team finds them on the
  till; this week's coffee ("ready", or "had, the next one on Monday"; a failed payment or a pause says so);
  and their member code as a **Code 128 barcode** with the code under it (`7Q2K 9XMB`), for scanning once the
  till has a scanner. `src/shared/lib/code128.ts` draws it; no library is loaded.
- **Someone who isn't a member** gets the club's price and a **Join the club** button to their own checkout
  (below), while the café is taking members.
- **No club**, or the agent off or unreachable: no card. The page never fails over it.

`GET /api/account/club` asks the agent server to server (`src/server/businessAgent/accounts.ts`): its
`account/summary` with the website key (`BUSINESS_AGENT_NEWSLETTER_KEY`) and the email in the body, said to be
checked (a session here exists only once the address is confirmed). Someone the agent doesn't know yet is
synced first, with their Square customer. It needs **Accounts & rewards on your website** switched on in the
agent (Website & SEO); off, the agent answers 404 and there's no card. The agent finds the person by email, so a
member sees their pass when they signed up here with the email they joined the club with.

## Selling the coffee club

`/club` (and a section on the home page, with a **Coffee club** link in the footer and phone menu) shows the
offer from the agent's public feed, `…/api/site/<business>/club` (`src/server/businessAgent/clubFeed.ts`,
re-read every 60 s; `BUSINESS_AGENT_CLUB_URL` names another address, or `off`, and unset a laptop reads nothing).
A down agent keeps the last answer; a 404 (no club) hides the section and the page says it isn't available;
`taking_members: false` shows the offer with no button. **Join** posts to `/api/account/club/join`, which asks the
agent (`account/club/join`, with the website key) for Square's checkout with the member's email filled in;
signed out, they sign in first and carry on from `/club?join=1`. Square returns them to
`/<lang>/account?club=joined`, built from `NEXT_PUBLIC_SITE_URL`, which must be https and the website the agent
has for the café (else it answers 400 and the button says it couldn't open the checkout). That page welcomes them
and re-reads the pass every 15 s for up to 3 minutes. It needs the website key and **Accounts & rewards on your
website** on in the agent.
