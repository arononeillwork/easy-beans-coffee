-- Long-lived social tokens that renew themselves. Instagram's lasts 60 days;
-- a weekly cron (/api/cron/instagram-token) swaps it for a fresh one and keeps
-- it here, so nobody has to re-paste it into Vercel. Service role only: RLS on,
-- no policies.
create table if not exists public.feed_tokens (
  name text primary key,
  token text not null,
  expires_at timestamptz,
  refreshed_at timestamptz not null default now()
);

alter table public.feed_tokens enable row level security;
