-- Website studio (/admin/website): example sites generated for the owner, one
-- project per brief, every (re)generation kept as a numbered version. A project
-- is bought separately through its own Square payment link; until it is paid the
-- versions are previews only.
create table if not exists public.website_projects (
  id uuid primary key default gen_random_uuid(),
  -- 'redesign' starts from an existing site at source_url; 'new' from a brief.
  mode text not null check (mode in ('redesign', 'new')),
  source_url text,
  brief jsonb not null default '{}'::jsonb,
  -- The version the owner chose to buy; set when the payment link is created.
  chosen_version integer,
  price_cents integer,
  currency text not null default 'EUR',
  square_payment_link_id text,
  square_payment_link_url text,
  square_order_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.website_projects (id) on delete cascade,
  version integer not null,
  html text not null,
  -- What the owner asked to change when regenerating; null for the first draft.
  feedback text,
  model text not null,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index if not exists website_projects_created_idx on public.website_projects (created_at desc);

drop trigger if exists website_projects_updated_at on public.website_projects;
create trigger website_projects_updated_at
  before update on public.website_projects
  for each row execute function public.set_updated_at();

-- Deny-all (no policies): only the site's server routes (service role) access them.
alter table public.website_projects enable row level security;
alter table public.website_versions enable row level security;
