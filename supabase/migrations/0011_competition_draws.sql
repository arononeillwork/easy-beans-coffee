-- Monthly €10 competition: one row per draw (applied 2026-10-17). Drives the
-- winner flow: random pick → owner sign-off → Square gift card + winner email
-- → Instagram post.
create table if not exists public.competition_draws (
  draw_month date primary key,
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'approved', 'no_entries')),
  entry_count integer not null default 0,
  winner_entry_id uuid references public.competition_entries (id) on delete set null,
  excluded_entry_ids uuid[] not null default '{}',
  admin_token text not null default replace(gen_random_uuid()::text, '-', ''),
  drawn_at timestamptz not null default now(),
  admin_notified_at timestamptz,
  admin_reminded_at timestamptz,
  approved_at timestamptz,
  gift_card_id text,
  gift_card_gan text,
  gift_card_error text,
  winner_emailed_at timestamptz,
  winner_token text not null default replace(gen_random_uuid()::text, '-', ''),
  ig_consent boolean,
  ig_consent_at timestamptz,
  ig_post_id text,
  ig_posted_at timestamptz,
  ig_post_error text,
  ig_error_notified_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists competition_draws_admin_token_unique on public.competition_draws (admin_token);
create unique index if not exists competition_draws_winner_token_unique on public.competition_draws (winner_token);

alter table public.competition_draws enable row level security;

-- Prize cards expire after 6 months (Square has no expiry of its own); the
-- daily job clears any balance left after this date.
alter table public.competition_draws
  add column if not exists gift_card_expires_at timestamptz,
  add column if not exists gift_card_cleared_at timestamptz;
