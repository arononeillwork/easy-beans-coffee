import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { taskService } from '../../taskService';
import type { Assignee, CreateTaskInput, Task, TaskId, TaskUpdate } from '../../taskModel';

/** Where a job lands when it's dragged: a new slot, and possibly a new group. */
export type TaskMove = {
  position: number;
  area?: string;
  priority?: string;
  section?: string | null;
};

type UseTasksResult = {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addTask: (input: CreateTaskInput) => Promise<void>;
  toggleCompleted: (id: TaskId, completed: boolean) => Promise<void>;
  toggleImportant: (id: TaskId, important: boolean) => Promise<void>;
  togglePinned: (id: TaskId, pinned: boolean) => Promise<void>;
  setArea: (id: TaskId, area: string) => Promise<void>;
  setPriority: (id: TaskId, priority: string) => Promise<void>;
  setAssignee: (id: TaskId, assignee: Assignee | null) => Promise<void>;
  editTask: (id: TaskId, updates: TaskUpdate) => Promise<void>;
  moveTask: (id: TaskId, move: TaskMove) => Promise<void>;
  removeTask: (id: TaskId) => Promise<Task | null>;
  restoreTask: (task: Task) => Promise<void>;
  reload: () => Promise<void>;
};

/**
 * Loads the board from Supabase and exposes CRUD actions with optimistic
 * updates that roll back on failure, so the UI stays snappy without going stale.
 */
export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!taskService) {
      setError(
        'The board is not configured. Add NEXT_PUBLIC_BOARD_SUPABASE_URL and NEXT_PUBLIC_BOARD_SUPABASE_ANON_KEY to .env.local.',
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTasks(await taskService.listOrThrow());
    } catch (cause) {
      // Keep whatever is already on screen rather than blanking the board: a
      // failed refresh should not look like the list was wiped.
      setError(
        `Could not load the board — ${cause instanceof Error ? cause.message : 'unknown error'}`,
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTask = useCallback(
    async (input: CreateTaskInput): Promise<void> => {
      if (!taskService) return;
      // New jobs go to the top of the board, where they'll be seen.
      const firstPosition = tasks.reduce((min, t) => Math.min(min, t.position ?? 0), 0);
      const created = await taskService.create({
        title: input.title.trim(),
        area: input.area,
        priority: input.priority,
        section: null,
        completed: false,
        important: false,
        pinned: false,
        position: firstPosition - 1,
      });
      if (!created) {
        setError('Could not add that job. Please try again.');
        return;
      }
      setTasks((prev) => [created, ...prev]);
    },
    [tasks],
  );

  const toggleCompleted = useCallback(
    (id: TaskId, completed: boolean) => patch(setTasks, setError, id, { completed }),
    [],
  );

  const toggleImportant = useCallback(
    (id: TaskId, important: boolean) => patch(setTasks, setError, id, { important }),
    [],
  );

  const togglePinned = useCallback(
    (id: TaskId, pinned: boolean) => patch(setTasks, setError, id, { pinned }),
    [],
  );

  const setArea = useCallback(
    (id: TaskId, area: string) => patch(setTasks, setError, id, { area }),
    [],
  );

  const setPriority = useCallback(
    (id: TaskId, priority: string) => patch(setTasks, setError, id, { priority }),
    [],
  );

  const setAssignee = useCallback(
    (id: TaskId, assignee: Assignee | null) => patch(setTasks, setError, id, { assignee }),
    [],
  );

  const editTask = useCallback(
    (id: TaskId, updates: TaskUpdate) =>
      patch(setTasks, setError, id, { title: updates.title.trim(), section: updates.section }),
    [],
  );

  const moveTask = useCallback(
    (id: TaskId, move: TaskMove) => patch(setTasks, setError, id, move as Partial<Task>),
    [],
  );

  /** Removes the row and hands it back so the caller can offer an undo. */
  const removeTask = useCallback(async (id: TaskId): Promise<Task | null> => {
    if (!taskService) return null;
    let previous: Task[] = [];
    let removed: Task | null = null;
    setTasks((prev) => {
      previous = prev;
      removed = prev.find((t) => t.id === id) ?? null;
      return prev.filter((t) => t.id !== id);
    });
    const ok = await taskService.delete(id);
    if (!ok) {
      setTasks(previous);
      setError('Could not delete that job. Please try again.');
      return null;
    }
    return removed;
  }, []);

  /** Undo a delete. The row comes back with a new id but the same content and slot. */
  const restoreTask = useCallback(async (task: Task): Promise<void> => {
    if (!taskService) return;
    const created = await taskService.create({
      title: task.title,
      area: task.area,
      priority: task.priority,
      section: task.section,
      assignee: task.assignee,
      completed: task.completed,
      important: task.important,
      pinned: task.pinned,
      position: task.position,
    });
    if (!created) {
      setError('Could not bring that job back. Please try again.');
      return;
    }
    setTasks((prev) => [...prev, created]);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    tasks,
    loading,
    error,
    clearError,
    addTask,
    toggleCompleted,
    toggleImportant,
    togglePinned,
    setArea,
    setPriority,
    setAssignee,
    editTask,
    moveTask,
    removeTask,
    restoreTask,
    reload,
  };
}

async function patch(
  setTasks: Dispatch<SetStateAction<Task[]>>,
  setError: Dispatch<SetStateAction<string | null>>,
  id: TaskId,
  updates: Partial<Task>,
): Promise<void> {
  if (!taskService) return;
  let previous: Task[] = [];
  setTasks((prev) => {
    previous = prev;
    return prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
  });
  const result = await taskService.update(id, updates);
  if (!result) {
    setTasks(previous);
    setError('Could not save your change. Please try again.');
  }
}
