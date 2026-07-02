import { BaseService } from '@common-lib/integrations/supabase/BaseService';
import { supabase } from '@/shared/lib/supabaseClient';
import { clientConfig } from '@/shared/lib/clientConfig';
import type { Todo } from './todoModel';

/** Supabase table name — set via VITE_TODO_TABLE (defaults to `todList`). */
export const TODO_TABLE = clientConfig.todoTable;

/**
 * Data access for tasks. Reuses the shared `BaseService` CRUD helpers from
 * common-lib so all Supabase operations stay consistent across features.
 */
class TodoService extends BaseService<Todo> {}

export const todoService: TodoService | null = supabase
  ? new TodoService(supabase, TODO_TABLE)
  : null;
