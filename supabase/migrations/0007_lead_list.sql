-- Lead list (project: CafeAgent) — turns `email_signups` into something that can
-- actually be segmented and mailed.
--
-- Three things this fixes:
--   1. Consent is now per purpose. The popup promises a 20% offer; the events
--      section promises "no offers". One boolean each, OR'd on re-signup and
--      never downgraded, so we can honour both promises in code.
--   2. Re-signups no longer vanish. 0005's unique index made the second
--      submission a swallowed 23505, losing the new source and consent.
--      `lead_touches` records every submission regardless.
--   3. The 20% is redeemable: one unique code per lead, marked redeemed only
--      when a Square payment actually completes.
--
-- Idempotent: safe to run more than once.

-- Consent, offer and provenance columns ---------------------------------------
alter table public.email_signups
  add column if not exists offer_optin boolean not null default false,
  add column if not exists events_optin boolean not null default false,
  add column if not exists offer_code text,
  add column if not exists offer_issued_at timestamptz,
  add column if not exists offer_expires_at timestamptz,
  add column if not exists offer_redeemed_at timestamptz,
  add column if not exists offer_order_id uuid,
  add column if not exists confirmed_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token text,
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists consent_ip inet,
  add column if not exists consent_user_agent text;

-- Seed the timestamps from the original row date rather than defaulting every
-- existing lead to "now" and losing when they actually signed up.
update public.email_signups set first_seen_at = created_at where first_seen_at is null;
update public.email_signups set last_seen_at  = created_at where last_seen_at  is null;

alter table public.email_signups
  alter column first_seen_at set default now(),
  alter column last_seen_at  set default now();

alter table public.email_signups
  alter column first_seen_at set not null,
  alter column last_seen_at  set not null;

-- Classify pre-0007 rows by the source they came in on. Guarded on "no consent
-- recorded yet" so a re-run can never re-opt-in someone who has since opted out.
update public.email_signups
   set offer_optin  = (source = 'first_visit_popup'),
       events_optin = (source = 'newsletter_section')
 where offer_optin = false
   and events_optin = false
   and unsubscribed_at is null;

-- Every lead needs an unsubscribe token; gen_random_uuid is core (no pgcrypto).
update public.email_signups
   set unsubscribe_token = replace(gen_random_uuid()::text, '-', '')
 where unsubscribe_token is null;

create unique index if not exists email_signups_offer_code_unique
  on public.email_signups (offer_code)
  where offer_code is not null;

create unique index if not exists email_signups_unsubscribe_token_unique
  on public.email_signups (unsubscribe_token)
  where unsubscribe_token is not null;

create index if not exists email_signups_created_at_idx
  on public.email_signups (created_at desc);

-- A redemption without a code would be untraceable back to the lead.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'email_signups_redeemed_requires_code'
  ) then
    alter table public.email_signups
      add constraint email_signups_redeemed_requires_code
      check (offer_redeemed_at is null or offer_code is not null);
  end if;
end $$;

-- The order carries the code it was placed with, so the payment webhook can
-- mark the lead redeemed without the browser being trusted to report it.
alter table public.orders
  add column if not exists offer_code text;

create index if not exists orders_offer_code_idx
  on public.orders (offer_code)
  where offer_code is not null;

-- Touch history ---------------------------------------------------------------
-- One row per submission, including duplicates. This is the audit trail for
-- consent: which form, which language, when.
create table if not exists public.lead_touches (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.email_signups (id) on delete cascade,
  source text not null,
  lang text,
  ip inet,
  created_at timestamptz not null default now()
);

create index if not exists lead_touches_lead_id_idx
  on public.lead_touches (lead_id, created_at desc);

-- Supports the per-IP signup rate limit in /api/signup.
create index if not exists lead_touches_ip_created_at_idx
  on public.lead_touches (ip, created_at desc)
  where ip is not null;

alter table public.lead_touches enable row level security;

-- Capture ---------------------------------------------------------------------
-- One atomic statement per submission. supabase-js `upsert` can't target the
-- `lower(email)` expression index, and a select-then-write in JS would race, so
-- the merge rules live here:
--   • consent accumulates, never downgrades
--   • `source` keeps first-touch attribution; lead_touches records the rest
--   • an offer code is issued once and never reissued
--   • re-signing up counts as opting back in after an unsubscribe
create or replace function public.capture_lead(
  p_email text,
  p_source text,
  p_lang text default null,
  p_offer_optin boolean default false,
  p_events_optin boolean default false,
  p_offer_code text default null,
  p_offer_expires_at timestamptz default null,
  p_ip inet default null,
  p_user_agent text default null
)
returns table (lead_id uuid, lead_offer_code text, code_issued_now boolean)
language plpgsql
as $$
declare
  v_id uuid;
  v_code text;
  v_issued boolean;
begin
  insert into public.email_signups as s (
    email, lang, source, offer_optin, events_optin,
    offer_code, offer_issued_at, offer_expires_at,
    unsubscribe_token, consent_ip, consent_user_agent
  )
  values (
    lower(p_email), p_lang, p_source, p_offer_optin, p_events_optin,
    case when p_offer_optin then p_offer_code end,
    case when p_offer_optin then now() end,
    case when p_offer_optin then p_offer_expires_at end,
    replace(gen_random_uuid()::text, '-', ''),
    p_ip, p_user_agent
  )
  on conflict (lower(email)) do update set
    offer_optin        = s.offer_optin or excluded.offer_optin,
    events_optin       = s.events_optin or excluded.events_optin,
    lang               = coalesce(excluded.lang, s.lang),
    last_seen_at       = now(),
    consent_ip         = coalesce(excluded.consent_ip, s.consent_ip),
    consent_user_agent = coalesce(excluded.consent_user_agent, s.consent_user_agent),
    offer_code = case
      when s.offer_code is not null then s.offer_code
      when s.offer_optin or excluded.offer_optin then p_offer_code
    end,
    offer_issued_at = case
      when s.offer_code is not null then s.offer_issued_at
      when s.offer_optin or excluded.offer_optin then now()
    end,
    offer_expires_at = case
      when s.offer_code is not null then s.offer_expires_at
      when s.offer_optin or excluded.offer_optin then p_offer_expires_at
    end,
    unsubscribed_at = case
      when excluded.offer_optin or excluded.events_optin then null
      else s.unsubscribed_at
    end
  -- now() is the transaction timestamp, so offer_issued_at only equals it when
  -- this very call issued the code. That is the signal to send the offer email,
  -- and it stops a repeated submit from re-mailing the same address.
  returning s.id, s.offer_code, (s.offer_issued_at = now())
  into v_id, v_code, v_issued;

  insert into public.lead_touches (lead_id, source, lang, ip)
  values (v_id, p_source, p_lang, p_ip);

  return query select v_id, v_code, coalesce(v_issued, false);
end $$;

-- RLS stays deny-all (no policies) on both tables: /api/signup and the admin
-- routes reach them with the service-role key, nothing is browser-readable.
