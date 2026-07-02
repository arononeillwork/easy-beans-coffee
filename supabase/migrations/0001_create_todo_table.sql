-- Admin "To Do" feature — task storage for the /admin page (project: CafeAgent).
-- Table name: "ToDo" (quoted to preserve camelCase / capital D).
-- Idempotent: safe to run whether the table is brand new or already created by
-- hand with a subset of columns.

create extension if not exists pgcrypto;

create table if not exists public."ToDo" (
  id uuid primary key default gen_random_uuid()
);

alter table public."ToDo" add column if not exists title       text;
alter table public."ToDo" add column if not exists completed   boolean not null default false;
alter table public."ToDo" add column if not exists important   boolean not null default false;
alter table public."ToDo" add column if not exists category    text;
alter table public."ToDo" add column if not exists created_at  timestamptz not null default now();
alter table public."ToDo" add column if not exists updated_at  timestamptz not null default now();

create index if not exists "ToDo_completed_idx" on public."ToDo" (completed);
create index if not exists "ToDo_category_idx"  on public."ToDo" (category);

-- Keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists "ToDo_set_updated_at" on public."ToDo";
create trigger "ToDo_set_updated_at"
  before update on public."ToDo"
  for each row execute function public.set_updated_at();

-- Row Level Security.
-- NOTE: the /admin page is gated only by a client-side PIN and uses the public
-- anon key, so this policy intentionally allows full anon access to make the app
-- work. This is NOT real per-user security — anyone with the URL + anon key can
-- read/write this table. For real protection, add Supabase Auth and scope this
-- policy to authenticated users.
alter table public."ToDo" enable row level security;
drop policy if exists "ToDo anon all" on public."ToDo";
create policy "ToDo anon all" on public."ToDo"
  for all to anon using (true) with check (true);
