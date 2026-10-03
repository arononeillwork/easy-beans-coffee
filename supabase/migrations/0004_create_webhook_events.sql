-- Square webhook event log for idempotent processing: the event_id primary
-- key makes duplicate deliveries no-ops (insert ... on conflict do nothing).
-- RLS deny-all: service-role access only.

create table if not exists public.webhook_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists webhook_events_received_at_idx
  on public.webhook_events (received_at desc);

alter table public.webhook_events enable row level security;
