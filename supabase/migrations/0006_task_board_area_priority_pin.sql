-- Admin task board — area / priority / section / pinned (project: CafeAgent).
--
-- The /admin page moved from a flat "category + star" list to a board that
-- groups by **area** (what kind of work) or **priority** (block / next / later),
-- with an optional **section** sub-heading inside an area. `pinned` floats a job
-- to the top of its group and outlines the row; `important` (the star) stays as
-- it was and is now also a filter.
--
-- Idempotent: safe to run more than once.

alter table public."ToDo" add column if not exists area     text not null default 'admin';
alter table public."ToDo" add column if not exists priority text not null default 'next';
alter table public."ToDo" add column if not exists section  text;
alter table public."ToDo" add column if not exists pinned   boolean not null default false;

-- Only these keys are understood by the board (see src/features/admin/taskModel.ts).
-- Anything else falls back to the defaults in the UI, so the checks are here to
-- stop typos going in from Studio rather than to guard the app.
alter table public."ToDo" drop constraint if exists "ToDo_area_check";
alter table public."ToDo" add constraint "ToDo_area_check" check (
  area in ('buy', 'admin', 'physical', 'brand', 'images', 'desk', 'marketing', 'ai')
);

alter table public."ToDo" drop constraint if exists "ToDo_priority_check";
alter table public."ToDo" add constraint "ToDo_priority_check" check (
  priority in ('block', 'next', 'later')
);

-- The old free-text `category` becomes the section sub-heading, so nothing that
-- was typed in before is lost. `category` itself is left in place (unused by the
-- app now) rather than dropped, so the data stays recoverable.
update public."ToDo"
set section = nullif(trim(category), '')
where section is null
  and category is not null
  and trim(category) <> '';

create index if not exists "ToDo_priority_idx" on public."ToDo" (priority);
create index if not exists "ToDo_area_idx"     on public."ToDo" (area);
create index if not exists "ToDo_pinned_idx"   on public."ToDo" (pinned);
