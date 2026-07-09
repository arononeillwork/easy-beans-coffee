import { z } from 'zod';

/**
 * A row in the `todList` Supabase table. Column names are snake_case to match
 * Postgres / the values Supabase returns verbatim.
 */
export const TodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  completed: z.boolean(),
  important: z.boolean(),
  category: z.string().max(100).nullable().optional(),
  assignee: z.string().max(100).nullable().optional(),
  // Shared manual sort order (see migration 0002). Fractional so items can be
  // dropped between two others. Nullable for rows created before the column.
  position: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;

/** People a task can be assigned to. Shown as a single-letter badge on each row. */
export const ASSIGNEES = ['Aron', 'Mark', 'Julio', 'Maria'] as const;

export type Assignee = (typeof ASSIGNEES)[number];

/** Input for creating a task — title required, category optional. */
export const CreateTodoSchema = z.object({
  title: z.string().trim().min(1, 'Please enter a task').max(500, 'Task is too long'),
  category: z.string().trim().max(100, 'Category is too long').optional(),
});

export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;

/** Editable fields of an existing task. */
export type TodoUpdate = {
  title: string;
  category: string | null;
};

export const SortMode = {
  Manual: 'manual',
  Important: 'important',
  Category: 'category',
} as const;

export type SortModeValue = (typeof SortMode)[keyof typeof SortMode];
