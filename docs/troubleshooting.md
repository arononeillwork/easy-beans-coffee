# Troubleshooting

## Menu

| Symptom | Cause → Fix |
| --- | --- |
| Menu renders but every price says "Ask at the counter" | The price book is empty — check `SQUARE_ACCESS_TOKEN` / `SQUARE_ENVIRONMENT` / `SQUARE_LOCATION_ID`. The board is local, so this is the only symptom of an unreachable Square. Logged once per process as "Square prices unavailable". |
| One drink has no price while the rest do | Its Square item was renamed. The join key is the item name — match `square:` in `src/features/menu/drinks.ts` to the POS. |
| A drink shows "Photograph coming soon" | No frame in `public/media/drinks/<art>/`. Add the shot to the café's Drive folder, add a line to `scripts/drinkArtSources.ts`, run `npm run media:drinks`. |
| Item missing from the site | Not in the location (`presentAtLocationIds`), archived, has no variations, or its name matches `SQUARE_EXCLUDE_RULES` (by default anything starting with "test" or "promo"). Check the item in Square Dashboard. |
| Test entry visible on the site | Rename it in Square so it matches `SQUARE_EXCLUDE_RULES`, or add a rule (e.g. `SQUARE_EXCLUDE_RULES="starts:test, contains:do not use"`) and redeploy. |
| Price change not showing | Catalog cache TTL is 5 min per server instance. Wait, or redeploy to force. Checkout always validates against ≤60 s-old data. |
| Item shows sold out incorrectly | Location override "sold out" flag on **all** variations in Square. |

## Checkout

| Symptom | Cause → Fix |
| --- | --- |
| 400 `invalid_request` | Body failed schema (name < 2 chars, >20 qty…). |
| 409 `catalog_mismatch` | IDs/modifiers don't match the live catalog (menu changed mid-order, or tampering). Customer should refresh and rebuild the cart. |
| 409 `sold_out` | Item sold out after being carted. |
| 422 `pickup_invalid` | ASAP while closed, or scheduled time outside hours / < 15 min prep / > 7 days. |
| 500 `checkout_failed` | Square CreatePaymentLink error — logs show the Square response. Common: token for wrong environment, location ID mismatch. |
| Redirect returns but page stuck on "confirming payment" | Webhook not arriving AND status fallback failing — check `SQUARE_WEBHOOK_*` env and that `syncOrderFromSquare` can reach Square (logs: `status sync failed`). |

## Webhooks

| Symptom | Cause → Fix |
| --- | --- |
| 401 `invalid_signature` | `SQUARE_WEBHOOK_NOTIFICATION_URL` doesn't byte-match the subscription URL, or wrong signature key, or a proxy altered the body. |
| Events arrive but status never updates | Order belongs to another source (POS sales also fire events — handler logs `webhook order sync skipped`), or Supabase env vars missing. |
| Duplicate processing suspected | It can't: `webhook_events.event_id` is the primary key; replays return `duplicate: true`. |

## Orders / status page

- Status page 404: token malformed or order row missing (checkout failed after link creation — check logs).
- Order paid but no ticket printed: printer profile (see `printer-profile-setup.md`) — auto-print off, wrong device owns the profile, or printer offline. The order still exists in Square Orders.
- Status stuck on "being prepared": staff must mark *Ready* in Square POS/Orders for the site to show the ready message.

## Admin (/admin)

- Blank list: `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing, or `ToDo` table not present in the Supabase project.
- PIN accepted but the list never loads: the board reads from the BusinessAgent project
  (`NEXT_PUBLIC_BOARD_SUPABASE_*`). If that database is overloaded, its API answers the
  browser's CORS preflight but times out on the read. Check BusinessAgent's API logs for
  504s and its Postgres logs for "statement timeout". Restart it from Project Settings →
  General.
- "The board is locked until a PIN is set": `ADMIN_BOARD_PIN` isn't in the deployment.
  Env changes only reach new builds, so redeploy after adding it.
- Every job in one group, area chips all empty, "Before we reopen" showing 0: the `ToDo` table is missing
  `area` / `priority` (migration 0006), so the board coerces every row to the same fallback group.
  Run `npm run fix:todo` — it says which columns are missing, and fills the grouping data back in
  once `supabase/apply-todo-board.sql` has been pasted into that project's SQL editor.
  (Adding columns needs the SQL editor: a Supabase API key can't run DDL.)
- "Could not save your change" on pin, area, priority or drag; "Could not add that job" on the
  compose bar: same cause. PostgREST rejects the whole write when it names a column the table
  hasn't got (`Could not find the 'pinned' column … in the schema cache`), and the board rolls the
  change back.

## Email signups

- Popup submit fails: `SUPABASE_SERVICE_ROLE_KEY` missing (503) or migration 0005 not applied (500 `storage_failed`).
