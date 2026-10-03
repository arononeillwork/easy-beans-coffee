import { z } from 'zod';

/**
 * The /admin task board — one open-ended list of everything the café needs.
 *
 * Every job has a **category** (stored as `area`: whose kind of work it is —
 * legal, the shop itself, design, content…) and a **priority** (how badly it's
 * needed). The board groups by one or the other; categories double as the
 * coloured filter chips. `section` is an optional sub-heading inside a
 * category, e.g. the Square jobs sitting together under "Square".
 *
 * On top of that, two flags the owner drives by hand:
 * - `important` — the star. Also a filter, so you can see only the starred jobs.
 * - `pinned`    — floats a job to the top of its group and outlines the row.
 */

/**
 * Categories — each one the view of a person who'd pick the job up. Order here
 * is the order groups and chips appear in; `hint` is the line on the group
 * header. Keys are stored in the table and checked by its constraint, so add
 * one here and in supabase/business-agent-todo-board.sql together.
 */
export const AREAS = [
  { key: 'legal', label: 'Legal & money', hint: 'Contracts, licences, insurance, bills' },
  { key: 'staff', label: 'People', hint: 'Roles, reviews, standards, hiring, pay' },
  { key: 'shop', label: 'Shop', hint: 'The space: fit-out, repairs, cleaning' },
  { key: 'buying', label: 'Buying', hint: 'Stock, packaging, equipment' },
  { key: 'menu', label: 'Food & drink', hint: 'Menu, recipes, ingredients, prep' },
  { key: 'tech', label: 'Tech & till', hint: 'Square, wifi, TV, website' },
  { key: 'design', label: 'Design', hint: 'Menus, signage, branding, print' },
  { key: 'content', label: 'Social & content', hint: 'Photos, videos, posts' },
  { key: 'marketing', label: 'Marketing', hint: 'Events, collabs, outreach' },
  { key: 'ideas', label: 'Future ideas', hint: 'New business ideas for after we reopen' },
] as const;

export type AreaKey = (typeof AREAS)[number]['key'];

/** Priorities, most urgent first. `why` is the one-line reminder on the group header. */
export const PRIORITIES = [
  { key: 'block', label: 'Before we reopen', why: 'Must be done before the shop reopens' },
  { key: 'next', label: 'Next up', why: 'Brings people in or saves you time' },
  { key: 'later', label: 'Later', why: 'Real jobs, but they can wait' },
] as const;

export type PriorityKey = (typeof PRIORITIES)[number]['key'];

/** What the compose bar starts on when you add a job. */
export const DEFAULT_AREA: AreaKey = 'shop';
export const DEFAULT_PRIORITY: PriorityKey = 'next';

/**
 * Where a row with a missing or unrecognised value gets shown. These match the
 * column defaults in supabase/business-agent-todo-board.sql so the same row
 * can't be filed under one category by Postgres and a different one by the board.
 */
const FALLBACK_AREA: AreaKey = 'shop';
const FALLBACK_PRIORITY: PriorityKey = 'next';

/** People a job can be assigned to. Shown as a single-letter badge on the row. */
export const ASSIGNEES = ['Aron', 'Mark', 'Julio', 'Maria'] as const;

export type Assignee = (typeof ASSIGNEES)[number];

/**
 * The primary key. The live table has a `bigint` id, so Supabase hands ids back
 * as **numbers**; migration 0001's `uuid` default only applies to a table
 * created from scratch. Both shapes are accepted so identity comparisons — the
 * one drag and drop relies on — match instead of failing on `54 === '54'`.
 */
export const TaskIdSchema = z.union([z.string(), z.number()]);

export type TaskId = z.infer<typeof TaskIdSchema>;

/**
 * A row in the Supabase `ToDo` table. Column names are snake_case because
 * Supabase returns them verbatim. `area` / `priority` / `section` are nullable
 * so rows written before migration 0006 still load (see the coercers below).
 */
export const TaskSchema = z.object({
  id: TaskIdSchema,
  title: z.string().min(1).max(500),
  completed: z.boolean(),
  important: z.boolean(),
  pinned: z.boolean(),
  area: z.string().max(40).nullable().optional(),
  priority: z.string().max(20).nullable().optional(),
  section: z.string().max(100).nullable().optional(),
  assignee: z.string().max(100).nullable().optional(),
  // Shared manual sort order (migration 0002). Fractional, so a row can be
  // dropped between two others with a single update.
  position: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

/** Input for adding a job from the compose bar. */
export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Add a job first').max(500, 'That job is too long'),
  area: z.string(),
  priority: z.string(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

/** Fields editable inline on an existing row. */
export type TaskUpdate = {
  title: string;
  section: string | null;
};

/** Which field the board groups by. */
export const GroupBy = {
  Priority: 'priority',
  Area: 'area',
} as const;

export type GroupByValue = (typeof GroupBy)[keyof typeof GroupBy];

/* ── reading loose DB values ────────────────────────────────────────────────
   The table is shared and hand-editable, so never trust the stored string.  */

export function isArea(value: unknown): value is AreaKey {
  return AREAS.some((a) => a.key === value);
}

export function toArea(value: string | null | undefined): AreaKey {
  return isArea(value) ? value : FALLBACK_AREA;
}

export function toPriority(value: string | null | undefined): PriorityKey {
  return PRIORITIES.some((p) => p.key === value) ? (value as PriorityKey) : FALLBACK_PRIORITY;
}

export function isAssignee(value: string | null | undefined): value is Assignee {
  return Boolean(value) && (ASSIGNEES as readonly string[]).includes(value as string);
}

export function areaLabel(value: string | null | undefined): string {
  const key = toArea(value);
  return AREAS.find((a) => a.key === key)?.label ?? key;
}

export function priorityLabel(value: string | null | undefined): string {
  const key = toPriority(value);
  return PRIORITIES.find((p) => p.key === key)?.label ?? key;
}
