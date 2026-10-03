-- Early-customer 20%-offer email captures from the first-visit popup.
-- `source` distinguishes future campaigns (e.g. shop launch, delivery).
-- RLS deny-all: inserts flow through /api/signup with the service-role key.

create table if not exists public.email_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lang text,
  source text not null default 'first_visit_popup',
  created_at timestamptz not null default now()
);

create unique index if not exists email_signups_email_unique
  on public.email_signups (lower(email));

alter table public.email_signups enable row level security;
