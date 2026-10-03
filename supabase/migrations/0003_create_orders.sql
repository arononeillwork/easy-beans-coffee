-- Collection orders created by the Square checkout flow.
-- Square is the source of truth for catalog/pricing; this table stores only
-- the operational order record + a sanitized snapshot for support.
-- RLS is enabled with NO policies (deny-all): the service-role key used by
-- API routes is the only access path. Idempotent for safe re-runs.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_status_token text not null unique,
  square_order_id text unique,
  square_payment_id text,
  square_payment_link_id text,
  square_location_id text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_note text,
  pickup_type text not null check (pickup_type in ('ASAP', 'SCHEDULED')),
  requested_pickup_at timestamptz,
  estimated_pickup_at timestamptz,
  payment_status text not null default 'PENDING',
  fulfillment_status text not null default 'NEW',
  currency text not null default 'EUR',
  total_amount integer not null,
  order_snapshot jsonb not null,
  lang text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_square_order_id_idx on public.orders (square_order_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Reuses the updated_at trigger function created in 0001.
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
