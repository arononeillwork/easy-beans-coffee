import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { todoService } from '../../todoService';
import type { Assignee, CreateTodoInput, Todo, TodoUpdate } from '../../todoModel';

type UseTodosResult = {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addTodo: (input: CreateTodoInput) => Promise<void>;
  toggleCompleted: (id: string, completed: boolean) => Promise<void>;
  toggleImportant: (id: string, important: boolean) => Promise<void>;
  setAssignee: (id: string, assignee: Assignee | null) => Promise<void>;
  editTodo: (id: string, updates: TodoUpdate) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

/**
 * Loads tasks from Supabase and exposes CRUD actions with optimistic updates
 * that roll back on failure, so the UI stays snappy without going stale.
 */
export function useTodos(): UseTodosResult {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!todoService) {
      setError('Supabase is not configured. Add your CafeAgent anon key to .env.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const data = await todoService.getAll(undefined, {
      column: 'created_at',
      ascending: true,
    });
    setTodos(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTodo = useCallback(async (input: CreateTodoInput): Promise<void> => {
    if (!todoService) return;
    const category = input.category?.trim() ? input.category.trim() : null;
    const created = await todoService.create({
      title: input.title.trim(),
      category,
      completed: false,
      important: false,
    });
    if (!created) {
      setError('Could not add the task. Please try again.');
      return;
    }
    setTodos((prev) => [...prev, created]);
  }, []);

  const toggleCompleted = useCallback(
    (id: string, completed: boolean) => patch(setTodos, setError, id, { completed }),
    [],
  );

  const toggleImportant = useCallback(
    (id: string, important: boolean) => patch(setTodos, setError, id, { important }),
    [],
  );

  const setAssignee = useCallback(
    (id: string, assignee: Assignee | null) => patch(setTodos, setError, id, { assignee }),
    [],
  );

  const editTodo = useCallback(
    (id: string, updates: TodoUpdate) =>
      patch(setTodos, setError, id, {
        title: updates.title.trim(),
        category: updates.category,
      }),
    [],
  );

  const removeTodo = useCallback(async (id: string): Promise<void> => {
    if (!todoService) return;
    let previous: Todo[] = [];
    setTodos((prev) => {
      previous = prev;
      return prev.filter((t) => t.id !== id);
    });
    const ok = await todoService.delete(id);
    if (!ok) {
      setTodos(previous);
      setError('Could not delete the task. Please try again.');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    todos,
    loading,
    error,
    clearError,
    addTodo,
    toggleCompleted,
    toggleImportant,
    setAssignee,
    editTodo,
    removeTodo,
    reload,
  };
}

async function patch(
  setTodos: Dispatch<SetStateAction<Todo[]>>,
  setError: Dispatch<SetStateAction<string | null>>,
  id: string,
  updates: Partial<Todo>,
): Promise<void> {
  if (!todoService) return;
  let previous: Todo[] = [];
  setTodos((prev) => {
    previous = prev;
    return prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
  });
  const result = await todoService.update(id, updates);
  if (!result) {
    setTodos(previous);
    setError('Could not save your change. Please try again.');
  }
}
