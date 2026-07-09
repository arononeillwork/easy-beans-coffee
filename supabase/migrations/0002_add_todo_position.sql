-- Admin "To Do" — add a shared manual sort order (project: CafeAgent).
-- Before this, the drag order lived only in each browser's localStorage, so it
-- never persisted across refreshes on other devices. `position` moves that order
-- into the table so it's the same for everyone, everywhere.
-- Idempotent: safe to run more than once.

-- double precision so items can be dropped *between* two others by averaging
-- their positions — a single-row update per drag, no full renumber needed.
alter table public."ToDo" add column if not exists position double precision;

-- Backfill existing rows using their current created_at order, so nothing
-- reshuffles the first time this runs. Only touches rows without a position yet.
update public."ToDo" as t
set position = sub.rn
from (
  select id, row_number() over (order by created_at) as rn
  from public."ToDo"
) as sub
where t.id = sub.id
  and t.position is null;

create index if not exists "ToDo_position_idx" on public."ToDo" (position);
