# Business Agent — account & rewards endpoints (spec)

**Status: built in the agent** (its docs/WEBSITE.md → Accounts & rewards is the current contract, the coffee club's `club` included); the site reads the coffee club from it (accounts.md → The coffee club pass). What follows was the proposal. This is the contract the Easy Beans
website needs from the Business Agent (the Cloudflare Worker `business-agent`,
`worker/site.ts` + `docs/WEBSITE.md` in the agent's repo). It extends the
existing `/api/site/<business>/…` family (menu, newsletter, signup,
unsubscribe) and follows the same rules.

## Why

The website's account page (Supabase sign-in, Square profile — see
[accounts.md](accounts.md)) should show a signed-in person what the café owes
them, and be the place where the café's customers, loyalty points and sales
reps meet:

- **Loyalty points ("beans")** — today read straight from Square Loyalty by the
  website. They should come from the agent instead, so the site has one
  back office to ask.
- **Credit / cashback** — customers who share the café earn credit in the
  agent's ledger (`rep_rewards`, rules in `rep_settings`); a Square gift card
  follows the ledger so it can be spent at the till.
- **Sales reps** — team, ambassadors and customer-reps with a code
  (`sales_reps.code`), reach, crew and commission.
- **Accounts stored in the agent** — everyone who signs up on the website is a
  Customer there (`customers`, `source: 'website'`), linked to a rep row when
  they are one (`sales_reps.customer_id`).

## Rules shared with the existing site routes

- Business is in the address: `/api/site/1/…` (Easy Beans is business 1). An
  unknown or unshared business gets the same `404 not shared` as the menu.
- **Server-to-server only.** Every route below needs the website key
  (`Authorization: Bearer …`, the one made on *Website & SEO*) and answers
  **no CORS** headers — these carry personal balances and must never be
  callable from a browser.
- **No personal data in URLs.** The email travels in a JSON body, which is why
  the reads are `POST`.
- The site treats any non-2xx, timeout (4 s) or "feature off" answer as
  *rewards unavailable* and simply hides the card; an account must never fail
  because the agent is down.
- Amounts are plain numbers in the business currency (EUR), two decimals.
  Dates are `YYYY-MM-DD`; timestamps ISO 8601 UTC.
- Marketing consent is **not touched** by any route here. It stays with
  `signup` / `unsubscribe` (GDPR: signing in is not a yes to marketing).

## Trust boundary

The website verifies the email (Supabase confirmed address or Google) before
calling. Each request carries `email_verified: true` to say so; the agent
trusts the key holder for that and refuses the call without it. The agent never
returns anyone but the person named in the body.

## 1. `POST /api/site/<business>/account/sync`

Called on a person's first authenticated request and again when they edit
their profile. Idempotent.

Request:

```json
{
  "email": "ana@example.com",
  "email_verified": true,
  "name": "Ana García",
  "phone": "+34 600 000 000",
  "square_customer_id": "CBASEN…",
  "lang": "es",
  "rep_code": "NATASH15"
}
```

Only `email` + `email_verified` are required. Behaviour:

1. Find the customer by `square_id`, else email, else phone (the same matching
   `worker/squareCustomers.ts` uses so nobody is added twice); create one with
   `source: 'website'` when none. App-typed fields win; only empty fields are
   filled.
2. `rep_code` (optional, phase 2): record that this person came in with that
   rep's code — an introduction on the rep's page, held for an admin as
   introductions already are (`rep_introductions`).
3. Does not set or clear `marketing_consent`.

Response `200`:

```json
{
  "customer_id": "9090e0a1-…",
  "created": false,
  "is_rep": true
}
```

## 2. `POST /api/site/<business>/account/summary`

Everything the account page's rewards area needs, in one read.

Request: `{ "email": "ana@example.com", "email_verified": true }`

Response `200` (`customer` is `null` when the person isn't on the list yet —
the site then calls `sync`):

```json
{
  "customer": { "id": "9090e0a1-…", "first_name": "Ana" },

  "points": {
    "program": {
      "one": "Bean",
      "other": "Beans",
      "tiers": [{ "id": "…", "name": "Free coffee", "points": 10 }]
    },
    "balance": 7,
    "lifetime": 23
  },

  "credit": {
    "balance": 1.25,
    "pending": 0.4,
    "gift_card_linked": true,
    "lines": [
      {
        "date": "2026-07-11",
        "label": "Cashback for a post",
        "amount": 0.47,
        "status": "approved",
        "note": "863 views · 20 likes"
      }
    ]
  },

  "cashback": {
    "on": true,
    "per_1000_views": 0.5,
    "per_100_likes": 0.2,
    "per_follower": 0.1,
    "max": 15
  },

  "rep": {
    "code": "NATASH15",
    "kind": "customer",
    "earns": "credit",
    "reach": 0,
    "reach_step": "Local voice",
    "rewards_that_grow_multiply_by": 1,
    "crew": { "leader": null, "members": 0 },
    "this_month": 0.47,
    "page_url": "https://business-agent.arononeillwork.workers.dev/rep/…"
  }
}
```

Field sources and rules:

- **`points`** — `null` when Square isn't the connected till, there is no
  active programme, or the customer has no loyalty account yet (enrolment
  stays at the till). The agent already reads this (`providers/squareLoyalty`,
  cached 30 min in `provider_cache`); the website stops calling Square
  Loyalty itself. Looked up by the customer's `square_id`.
- **`credit`** — sum of the customer's approved `rep_rewards` lines through
  their rep row; `pending` is lines waiting for an admin. `lines` is the last
  20, newest first. `null` for someone with no ledger at all. Reversals
  (`reverses`) appear as negative lines.
- **`cashback`** — straight from `rep_settings`, so the page can explain how
  credit is earned. `null` when `cashback_on` is false.
- **`rep`** — `null` unless a `sales_reps` row has this customer's id and is
  `approved` and `active`. `earns` is `credit` for customers and
  `commission` for team/ambassadors (their `credit` block is then the
  commission balance). `page_url` is their no-sign-in rep page, **only if**
  the agent is happy exposing the token to the site; otherwise omit it.
- Nothing about other reps, other customers' balances or the crew's members'
  identities — `crew.members` is a count.

Errors: `400` bad body, `401` missing/wrong key, `403` `email_verified` not
true, `404` business not shared or the website feature off, `429` over the
key's rate limit.

## 3. `POST /api/site/<business>/account/erase` (GDPR)

The website's account deletion today calls `unsubscribe`, and the agent can't
delete anyone, so the café does it by hand. Proposed replacement:

Request: `{ "email": "…", "email_verified": true }`

- Customer has **no** ledger lines and isn't a rep → delete the customer row.
- Otherwise → blank the personal fields (name, email, phone, birthday,
  notes, instagram), keep the id, ledger lines and amounts (accounting), set
  `marketing_consent: false`, unlink a customer-rep (`active: false`).
- Response `200 { "erased": true, "kept": "ledger" | null }`.

## Out of scope (decide later)

- **An agent-owned points ledger.** As specced, the agent *reads* beans from
  Square Loyalty, so earning and spending stay at the till and the site can
  never disagree with the counter. Moving points into the agent means the
  agent awarding them from Square sales (webhook) and writing them back to
  the till — a separate, larger change.
- Redeeming or spending credit from the website (it is spent at the till via
  the Square gift card on file).
- Letting a customer apply to become a rep from the website (admins add reps
  today; new reps wait for approval).

## Acceptance checks for the agent

1. Without the key, or with a wrong one: `401`, and no CORS headers on any
   response from these routes.
2. `sync` twice with the same email: one customer, `created` false the
   second time; a Square customer with the same email is linked, not
   duplicated.
3. `sync` never changes `marketing_consent`.
4. `summary` for a customer who is a rep with approved lines returns
   `credit.balance` equal to the ledger sum and the same figure the rep sees
   on their `/rep/<token>` page.
5. `summary` for a customer with no ledger and no rep row returns
   `credit: null`, `rep: null`.
6. `summary` for an unknown email returns `customer: null`, `200`.
7. `erase` on a customer with ledger lines keeps the lines and blanks the
   personal fields.
8. Email never appears in logs or URLs.

## Website side (this repo), once the above exists

- `src/server/businessAgent/account.ts` — `syncAccount`, `fetchSummary`,
  `eraseAccount`: same pattern as `newsletter.ts` (key, 4 s timeout, never
  throws, off on a laptop unless `BUSINESS_AGENT_SITE_URL` is set).
- `/api/account/rewards` reads `summary` instead of Square Loyalty; the
  response keeps its current `program` / `balance` / `lifetimePoints` shape
  and gains `credit`, `cashback` and `rep`.
- The account page's rewards card gains a credit balance and, for reps, their
  code, reach and crew.
- `DELETE /api/account` calls `erase` instead of `unsubscribe`.
