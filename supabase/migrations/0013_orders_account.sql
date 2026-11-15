-- Collection orders belong to an account: checkout now requires sign-in, and
-- each order records who placed it so it shows on their /account page.
--
-- auth_user_id   the Supabase Auth user. ON DELETE SET NULL: deleting an
--                account (GDPR erasure) unlinks its orders but keeps them —
--                paid orders are accounting records.
-- square_customer_id  the Square customer the order was attached to (the
--                same id kept in the user's app_metadata), so the till sees
--                the order on that customer's profile.
--
-- Orders placed before this migration simply have both columns null.
-- Idempotent: safe to run more than once.

alter table public.orders
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null,
  add column if not exists square_customer_id text;

create index if not exists orders_auth_user_created_idx
  on public.orders (auth_user_id, created_at desc)
  where auth_user_id is not null;
