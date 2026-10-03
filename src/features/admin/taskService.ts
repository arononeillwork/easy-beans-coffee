import { createClient } from '@supabase/supabase-js';
import { BaseService } from '@common-lib/integrations/supabase/BaseService';
import { clientConfig } from '@/shared/lib/clientConfig';
import type { Task } from './taskModel';

/** Supabase table name — set via NEXT_PUBLIC_TODO_TABLE (defaults to `ToDo`). */
export const TASK_TABLE = clientConfig.todoTable;

/**
 * Data access for the admin task board. Reuses the shared `BaseService` CRUD
 * helpers from common-lib so all Supabase operations stay consistent.
 */
class TaskService extends BaseService<Task> {
  /**
   * The board's read, with failures kept distinguishable from an empty table.
   *
   * `BaseService.getAll` logs and returns `[]` on error, which is right for a
   * list that may legitimately be empty but wrong here: a failed query renders
   * as "you have no jobs" and the whole board looks wiped. That is exactly what
   * a schema change does — PostgREST serves a cached schema and rejects reads
   * for a few seconds after a column is added — so the one moment the board is
   * most alarming to lose is the one moment `getAll` hides the reason.
   */
  async listOrThrow(): Promise<Task[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .order('position', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Task[];
  }
}

/**
 * The board has its own client because its table lives in the BusinessAgent
 * project (NEXT_PUBLIC_BOARD_SUPABASE_*), while the rest of the site talks to
 * its own database through the common-lib singleton.
 */
const boardClient =
  clientConfig.boardSupabaseUrl && clientConfig.boardSupabaseAnonKey
    ? createClient(clientConfig.boardSupabaseUrl, clientConfig.boardSupabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null;

export const taskService: TaskService | null = boardClient
  ? new TaskService(boardClient, TASK_TABLE)
  : null;
