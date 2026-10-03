-- Newsletter interests — the subscribe modal now asks what each lead wants to
-- hear about. Stored as a text[] of stable keys (labels live in the site
-- dictionaries): coffee, spanish, english, menu, events, offers.
-- Also adds the modal's optional phone field, kept for Square customer
-- records later — never required.
--
-- Idempotent: safe to run more than once.

alter table public.email_signups
  add column if not exists interests text[] not null default '{}',
  add column if not exists phone text;

-- capture_lead gains p_interests. Dropped first: create-or-replace cannot
-- change a signature — it would leave the old function behind as an overload,
-- which breaks PostgREST rpc resolution.
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
  -- now() is the transaction timestamp, so offer_issued_at only equals it when
  -- this very call issued the code. That is the signal to send the offer email,
  -- and it stops a repeated submit from re-mailing the same address.
  returning s.id, s.offer_code, (s.offer_issued_at = now())
  into v_id, v_code, v_issued;

  insert into public.lead_touches (lead_id, source, lang, ip)
  values (v_id, p_source, p_lang, p_ip);

  return query select v_id, v_code, coalesce(v_issued, false);
end $$;
