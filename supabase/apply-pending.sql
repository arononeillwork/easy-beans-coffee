-- ─────────────────────────────────────────────────────────────────────────────
-- Easy Beans — pending tables (orders, webhook_events, email_signups, lead_touches).
-- Paste this whole file into Supabase Studio → SQL Editor → Run.
-- Project: https://supabase.com/dashboard/project/hvjtyzcxmstijbakkqxv/sql/new
-- Idempotent: safe to run more than once.
-- (Same content as migrations 0003–0005 and 0007–0009.)
-- ─────────────────────────────────────────────────────────────────────────────

-- updated_at helper (also created by the ToDo migration; kept for fresh DBs)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Orders ---------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_status_token text not null unique,
  square_order_id text unique,
  square_payment_id text,
  square_payment_link_id text,
  square_location_id text not null,
  customer_name text not null,
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

-- The order form stopped asking for a phone number (migration 0008); drops the
-- column on a database created before that.
alter table public.orders drop column if exists customer_phone;

create index if not exists orders_square_order_id_idx on public.orders (square_order_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

-- Webhook events (idempotent processing) -------------------------------------
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

-- Email signups (newsletter subscribe modal) ----------------------------------
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

-- Lead list (0007) -------------------------------------------------------------
-- Per-purpose consent, redeemable offer codes, and a touch row per submission
-- so re-signups stop disappearing into the unique-email conflict.
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
  add column if not exists consent_user_agent text,
  -- 0009: what the lead ticked in the subscribe modal (stable keys; labels
  -- live in the site dictionaries), plus its optional phone field — kept for
  -- Square customer records later, never required.
  add column if not exists interests text[] not null default '{}',
  add column if not exists phone text;

update public.email_signups set first_seen_at = created_at where first_seen_at is null;
update public.email_signups set last_seen_at  = created_at where last_seen_at  is null;

alter table public.email_signups
  alter column first_seen_at set default now(),
  alter column last_seen_at  set default now();

alter table public.email_signups
  alter column first_seen_at set not null,
  alter column last_seen_at  set not null;

-- Guarded so a re-run can never re-opt-in someone who has since opted out.
update public.email_signups
   set offer_optin  = (source = 'first_visit_popup'),
       events_optin = (source = 'newsletter_section')
 where offer_optin = false
   and events_optin = false
   and unsubscribed_at is null;

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

alter table public.orders
  add column if not exists offer_code text;

create index if not exists orders_offer_code_idx
  on public.orders (offer_code)
  where offer_code is not null;

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

create index if not exists lead_touches_ip_created_at_idx
  on public.lead_touches (ip, created_at desc)
  where ip is not null;

alter table public.lead_touches enable row level security;

-- 0009 signature (adds p_interests). The drop clears the pre-0009 function on
-- a database that already ran it — create-or-replace cannot change a signature
-- and would otherwise leave an overload behind, breaking PostgREST rpc.
drop function if exists public.capture_lead(
  text, text, text, boolean, boolean, text, timestamptz, inet, text);

create or replace function public.capture_lead(
  p_email text,
  p_source text,
  p_lang text default null,
  p_offer_optin boolean default false,
  p_events_optin boolean default false,
  p_offer_code text default null,
  p_offer_expires_at timestamptz default null,
  p_ip inet default null,
  p_user_agent text default null,
  p_interests text[] default '{}',
  p_phone text default null
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
    unsubscribe_token, consent_ip, consent_user_agent, interests, phone
  )
  values (
    lower(p_email), p_lang, p_source, p_offer_optin, p_events_optin,
    case when p_offer_optin then p_offer_code end,
    case when p_offer_optin then now() end,
    case when p_offer_optin then p_offer_expires_at end,
    replace(gen_random_uuid()::text, '-', ''),
    p_ip, p_user_agent, coalesce(p_interests, '{}'), nullif(trim(p_phone), '')
  )
  on conflict (lower(email)) do update set
    offer_optin        = s.offer_optin or excluded.offer_optin,
    events_optin       = s.events_optin or excluded.events_optin,
    -- Interests accumulate like consent: a later submit that leaves a box
    -- unticked must not erase an interest recorded earlier.
    interests = (
      select coalesce(array_agg(distinct i), '{}')
      from unnest(s.interests || excluded.interests) as i
    ),
    -- A newly supplied phone wins; an empty submit keeps what we had.
    phone              = coalesce(excluded.phone, s.phone),
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
  returning s.id, s.offer_code, (s.offer_issued_at = now())
  into v_id, v_code, v_issued;

  insert into public.lead_touches (lead_id, source, lang, ip)
  values (v_id, p_source, p_lang, p_ip);

  return query select v_id, v_code, coalesce(v_issued, false);
end $$;

-- RLS note: deny-all on purpose (no policies). The site's API routes use the
-- service-role key, which bypasses RLS. Nothing here is browser-accessible.

-- Accounts note: customer sign-in is Supabase Auth (email+password / Google),
-- which lives in the managed `auth` schema — no tables to create here. The
-- customer profile itself lives in Square's Customer Directory.
-- If an earlier draft created public.auth_codes, it is unused now:
drop table if exists public.auth_codes;
