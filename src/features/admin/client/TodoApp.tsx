import { useMemo, useState } from 'react';
import { Alert, Box, Container, Snackbar, Typography } from '@mui/material';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import AddTodoForm from './components/AddTodoForm';
import SortControls from './components/SortControls';
import TodoList from './components/TodoList';
import ProgressRing from './components/ProgressRing';
import { useTodos } from './hooks/useTodos';
import { useTodoOrder } from './hooks/useTodoOrder';
import { SortMode, type SortModeValue, type Todo } from '../todoModel';
import { EmptyCard, GlassHeader, PageRoot } from './styled';

const SORT_KEY = 'ebc:admin:sort-mode';

export default function TodoApp() {
  const {
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
  } = useTodos();
  const { order, saveOrder } = useTodoOrder();
  const [sortMode, setSortMode] = useState<SortModeValue>(readSortMode);

  const orderedTodos = useMemo(() => orderTodos(todos, order, sortMode), [todos, order, sortMode]);
  const categories = useMemo(() => uniqueCategories(todos), [todos]);
  const total = todos.length;
  const done = useMemo(() => todos.filter((t) => t.completed).length, [todos]);
  const remaining = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const handleSortChange = (mode: SortModeValue): void => {
    setSortMode(mode);
    writeSortMode(mode);
  };

  return (
    <PageRoot>
      <GlassHeader>
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="Easy Beans Coffee"
            sx={{ height: 44, width: 'auto', display: 'block', flex: 1, objectFit: 'contain', objectPosition: 'left center' }}
          />
        </Container>
      </GlassHeader>

      <Container maxWidth="sm" sx={{ pt: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{ color: 'secondary.dark', fontWeight: 700, letterSpacing: '0.14em', lineHeight: 1 }}
            >
              {formatToday()}
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontSize: { xs: '1.9rem', sm: '2.3rem' }, lineHeight: 1.1, mt: 0.5 }}
            >
              {summary(loading, total, remaining)}
            </Typography>
          </Box>
          <ProgressRing percent={percent} loading={loading} />
        </Box>

        <AddTodoForm categories={categories} onAdd={addTodo} />

        <Box sx={{ mt: 3 }}>
          <SortControls sortMode={sortMode} onChange={handleSortChange} count={remaining} />
          {!loading && orderedTodos.length === 0 && !error ? (
            <EmptyState />
          ) : (
            <TodoList
              items={orderedTodos}
              draggable={sortMode === SortMode.Manual}
              onReorder={saveOrder}
              onToggleCompleted={toggleCompleted}
              onToggleImportant={toggleImportant}
              onSetAssignee={setAssignee}
              onEdit={editTodo}
              onDelete={removeTodo}
            />
          )}
        </Box>
      </Container>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError} variant="filled" sx={{ width: '100%', borderRadius: 3 }}>
          {error}
        </Alert>
      </Snackbar>
    </PageRoot>
  );
}

function EmptyState() {
  return (
    <EmptyCard>
      <Box
        sx={{
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(217,154,78,0.15)',
          color: 'secondary.dark',
        }}
      >
        <TaskAltRoundedIcon fontSize="large" />
      </Box>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        All clear
      </Typography>
      <Typography color="text.secondary">Add your first task above to get the day brewing.</Typography>
    </EmptyCard>
  );
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function summary(loading: boolean, total: number, remaining: number): string {
  if (loading) return 'Loading your tasks…';
  if (total === 0) return 'Nothing on the board yet.';
  if (remaining === 0) return 'Everything is done — nicely brewed. ☕';
  return `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left to go.`;
}

function orderTodos(todos: Todo[], order: string[], sortMode: SortModeValue): Todo[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  const manual = [...todos].sort((a, b) => {
    const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.created_at.localeCompare(b.created_at);
  });

  let sorted = manual;
  if (sortMode === SortMode.Important) {
    sorted = [...manual].sort((a, b) => Number(b.important) - Number(a.important));
  } else if (sortMode === SortMode.Category) {
    sorted = [...manual].sort((a, b) => compareCategory(a.category, b.category));
  }

  // Completed tasks always sink to the bottom, keeping their relative order
  // (Array.prototype.sort is stable). This groups "done" items together.
  return [...sorted].sort((a, b) => Number(a.completed) - Number(b.completed));
}

function compareCategory(a: string | null | undefined, b: string | null | undefined): number {
  const ca = a?.trim() ?? '';
  const cb = b?.trim() ?? '';
  if (ca === cb) return 0;
  if (!ca) return 1;
  if (!cb) return -1;
  return ca.localeCompare(cb);
}

function uniqueCategories(todos: Todo[]): string[] {
  const set = new Set<string>();
  todos.forEach((t) => {
    const c = t.category?.trim();
    if (c) set.add(c);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function readSortMode(): SortModeValue {
  try {
    const raw = localStorage.getItem(SORT_KEY);
    if (raw === SortMode.Important || raw === SortMode.Category || raw === SortMode.Manual) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return SortMode.Manual;
}

function writeSortMode(mode: SortModeValue): void {
  try {
    localStorage.setItem(SORT_KEY, mode);
  } catch {
    /* ignore */
  }
}
