-- Monthly €10 competition (applied 2026-10-17). One entry per email per draw
-- month; the person's contact + marketing consent lives on email_signups (via
-- capture_lead, source 'competition'), this table records the entry itself.
create table if not exists public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.email_signups (id) on delete cascade,
  draw_month date not null,
  full_name text not null,
  email text not null,
  phone text,
  instagram_handle text not null,
  terms_accepted_at timestamptz not null default now(),
  marketing_optin boolean not null default true,
  source text,
  lang text,
  ip inet,
  user_agent text,
  is_winner boolean not null default false,
  winner_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists competition_entries_email_month_unique
  on public.competition_entries (lower(email), draw_month);

create index if not exists competition_entries_draw_month_idx
  on public.competition_entries (draw_month);

-- Deny-all (no policies): only the site's server routes (service role) access it.
alter table public.competition_entries enable row level security;
