import { AREAS, toArea, type Task, type TaskId } from '../../taskModel';

export type BoardFilters = {
  areaFilter: string | null;
  starredOnly: boolean;
  showDone: boolean;
};

/** A run of jobs under an optional sub-heading (used for e.g. the Square jobs). */
export type BoardSection = {
  key: string;
  label: string | null;
  items: Task[];
};

export type BoardGroup = {
  key: string;
  label: string;
  why?: string;
  count: number;
  sections: BoardSection[];
};

/**
 * Turns the flat table into what the page shows: filtered, grouped by category,
 * pinned jobs first, done ones sunk to the bottom of their group.
 */
export function buildBoard(tasks: Task[], filters: BoardFilters): BoardGroup[] {
  const visible = tasks.filter((task) => {
    if (!filters.showDone && task.completed) return false;
    if (filters.starredOnly && !task.important) return false;
    if (filters.areaFilter && toArea(task.area) !== filters.areaFilter) return false;
    return true;
  });

  const ordered = [...visible].sort(byManualOrder);

  return AREAS.map((area) => {
    const items = ordered.filter((task) => toArea(task.area) === area.key).sort(byPinnedThenDone);
    return {
      key: area.key,
      label: area.label,
      why: area.hint,
      count: items.length,
      sections: splitIntoSections(items),
    };
  })
    .filter((group) => group.count > 0);
}

/** Groups an area's jobs: loose ones first, then each named section in the order it appears. */
function splitIntoSections(items: Task[]): BoardSection[] {
  const loose = items.filter((task) => !task.section?.trim());
  const named: BoardSection[] = [];
  items.forEach((task) => {
    const label = task.section?.trim();
    if (!label) return;
    const existing = named.find((section) => section.label === label);
    if (existing) existing.items.push(task);
    else named.push({ key: label, label, items: [task] });
  });
  const sections = loose.length > 0 ? [{ key: '', label: null, items: loose }] : [];
  return [...sections, ...named];
}

/** The shared manual order, with created_at breaking ties on equal positions. */
function byManualOrder(a: Task, b: Task): number {
  const pa = a.position ?? Number.MAX_SAFE_INTEGER;
  const pb = b.position ?? Number.MAX_SAFE_INTEGER;
  if (pa !== pb) return pa - pb;
  return a.created_at.localeCompare(b.created_at);
}

/** Pinned jobs rise to the top of their group; done ones sink. Stable otherwise. */
function byPinnedThenDone(a: Task, b: Task): number {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  return Number(b.pinned) - Number(a.pinned);
}

/** Every visible job in the order it appears on the page — what a drag reorders. */
export function flattenBoard(groups: BoardGroup[]): Task[] {
  return groups.flatMap((group) => group.sections.flatMap((section) => section.items));
}

export type ResolvedMove = {
  position: number;
  area?: string;
  section?: string | null;
};

/**
 * Works out where a dragged job landed: it adopts the group (and section) of the
 * row it was dropped on, and takes a position between its new neighbours so only
 * the one row needs saving.
 *
 * Neighbours are picked from rows in the same bucket — same group, same pin
 * state, same done state — because those are what the display order compares it
 * against. Averaging across a bucket boundary would store a position that
 * doesn't match where the row was dropped.
 */
export function resolveMove(
  displayOrder: Task[],
  activeId: TaskId,
  overId: TaskId,
): ResolvedMove | null {
  const fromIndex = displayOrder.findIndex((task) => task.id === activeId);
  const toIndex = displayOrder.findIndex((task) => task.id === overId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null;

  const active = displayOrder[fromIndex];
  const over = displayOrder[toIndex];

  const moved: Task[] = [...displayOrder];
  moved.splice(fromIndex, 1);
  moved.splice(toIndex, 0, active);

  // Group fields the row inherits from where it was dropped.
  const adopted: ResolvedMove = {
    position: 0,
    area: toArea(over.area),
    section: over.section?.trim() || null,
  };

  const target: Task = { ...active, ...adopted } as Task;
  const bucket = bucketOf(target);
  const before = findNeighbour(moved, toIndex - 1, -1, bucket, active.id);
  const after = findNeighbour(moved, toIndex + 1, 1, bucket, active.id);

  return { ...adopted, position: positionBetween(before, after) };
}

function bucketOf(task: Task): string {
  return [toArea(task.area), Number(task.pinned), Number(task.completed)].join('|');
}

function findNeighbour(
  list: Task[],
  start: number,
  step: number,
  bucket: string,
  skipId: TaskId,
): Task | null {
  for (let i = start; i >= 0 && i < list.length; i += step) {
    const candidate = list[i];
    if (candidate.id === skipId) continue;
    if (bucketOf(candidate) === bucket) return candidate;
  }
  return null;
}

function positionBetween(before: Task | null, after: Task | null): number {
  const from = before?.position ?? null;
  const to = after?.position ?? null;
  if (from === null && to === null) return 0;
  if (from === null) return (to as number) - 1;
  if (to === null) return from + 1;
  return (from + to) / 2;
}

/** The whole board as plain text, for pasting into a message or a note. */
export function toPlainText(tasks: Task[]): string {
  const lines: string[] = ["Easy Beans Coffee — what's left", ''];
  AREAS.forEach((area) => {
    const items = [...tasks]
      .filter((task) => toArea(task.area) === area.key)
      .sort(byManualOrder)
      .sort(byPinnedThenDone);
    if (items.length === 0) return;
    lines.push(area.label.toUpperCase());
    items.forEach((task) => {
      const tags: string[] = [];
      if (task.section?.trim()) tags.push(task.section.trim());
      if (task.assignee) tags.push(task.assignee);
      const flags = `${task.pinned ? '📌 ' : ''}${task.important ? '★ ' : ''}`;
      const suffix = tags.length > 0 ? `  (${tags.join(' / ')})` : '';
      lines.push(`${task.completed ? '[x]' : '[ ]'} ${flags}${task.title}${suffix}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}
