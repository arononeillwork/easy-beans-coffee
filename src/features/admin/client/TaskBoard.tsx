import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, ButtonBase, Snackbar, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import AddTaskForm from './components/AddTaskForm';
import BoardControls from './components/BoardControls';
import BoardHero from './components/BoardHero';
import TaskGroups from './components/TaskGroups';
import { useTasks } from './hooks/useTasks';
import { buildBoard, toPlainText } from './lib/board';
import { EmptyCard, Foot, PageRoot, Toast, Wrap } from './styled';
import { card, line, muted, roseInk } from './adminTheme';
import { isArea, toArea, type Task, type TaskId } from '../taskModel';

const VIEW_KEY = 'ebc:admin:view';

type View = {
  areaFilter: string | null;
  starredOnly: boolean;
  showDone: boolean;
};

const DEFAULT_VIEW: View = {
  areaFilter: null,
  starredOnly: false,
  showDone: false,
};

/** The /admin task board: what's left, grouped by category. */
export default function TaskBoard() {
  const {
    tasks,
    loading,
    error,
    clearError,
    addTask,
    toggleCompleted,
    toggleImportant,
    togglePinned,
    setArea,
    setAssignee,
    editTask,
    moveTask,
    removeTask,
    restoreTask,
  } = useTasks();

  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [toast, setToast] = useState<string | null>(null);
  const [undoTarget, setUndoTarget] = useState<Task | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [barHeight, setBarHeight] = useState(58);

  // The view lives in localStorage, not the table — it's a per-person preference.
  useEffect(() => setView(readView()), []);

  // The toast clears itself, and the undo offer goes with it.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
      setUndoTarget(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Group headers stick directly below the control bar, whose height changes as
  // the category chips wrap.
  useEffect(() => {
    const measure = (): void => {
      const height = barRef.current?.getBoundingClientRect().height;
      if (height) setBarHeight(Math.round(height));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [loading, tasks.length]);

  const groups = useMemo(() => buildBoard(tasks, view), [tasks, view]);
  const open = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const starredCount = useMemo(() => open.filter((t) => t.important).length, [open]);
  // What each category chip would show under the other filters as they stand.
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    tasks.forEach((task) => {
      if (!view.showDone && task.completed) return;
      if (view.starredOnly && !task.important) return;
      const key = toArea(task.area);
      counts[key] = (counts[key] ?? 0) + 1;
      counts.all += 1;
    });
    return counts;
  }, [tasks, view.showDone, view.starredOnly]);
  const done = tasks.length - open.length;
  const percent = tasks.length === 0 ? 0 : (done / tasks.length) * 100;

  const update = (patch: Partial<View>): void => {
    setView((prev) => {
      const next = { ...prev, ...patch };
      writeView(next);
      return next;
    });
  };

  const handleDelete = async (id: TaskId): Promise<void> => {
    const removed = await removeTask(id);
    if (!removed) return;
    setUndoTarget(removed);
    setToast('Deleted');
  };

  const handleUndo = async (): Promise<void> => {
    const task = undoTarget;
    setUndoTarget(null);
    setToast(null);
    if (task) await restoreTask(task);
  };

  const handleCopy = async (): Promise<void> => {
    const text = toPlainText(tasks);
    try {
      await navigator.clipboard.writeText(text);
      setToast('Copied as text');
    } catch {
      setToast('Could not copy — clipboard blocked');
    }
  };

  return (
    <PageRoot style={{ '--barH': `${barHeight}px` } as React.CSSProperties}>
      <Wrap>
        <BoardHero
          open={open.length}
          done={done}
          percent={percent}
          loading={loading}
        />

        {/* The wrapper carries the stickiness: the bar inside it can only travel
            as far as its own box, which is no distance at all. */}
        <Box ref={barRef} sx={{ position: 'sticky', top: 0, zIndex: 8 }}>
          <BoardControls
            areaFilter={view.areaFilter}
            onAreaFilterChange={(areaFilter) => update({ areaFilter })}
            starredOnly={view.starredOnly}
            onStarredOnlyChange={(starredOnly) => update({ starredOnly })}
            showDone={view.showDone}
            onShowDoneChange={(showDone) => update({ showDone })}
            starredCount={starredCount}
            areaCounts={areaCounts}
          />
        </Box>

        <AddTaskForm onAdd={addTask} areaFilter={view.areaFilter} />

        {loading ? (
          <Typography sx={{ color: muted }}>Loading your list…</Typography>
        ) : groups.length === 0 ? (
          <EmptyState starredOnly={view.starredOnly} filtered={view.areaFilter !== null} />
        ) : (
          <TaskGroups
            groups={groups}
            onMove={moveTask}
            onToggleCompleted={toggleCompleted}
            onToggleImportant={toggleImportant}
            onTogglePinned={togglePinned}
            onSetArea={setArea}
            onSetAssignee={setAssignee}
            onEdit={editTask}
            onDelete={handleDelete}
          />
        )}

        <Foot>
          <ButtonBase
            onClick={handleCopy}
            sx={{
              backgroundColor: card,
              border: `1px solid ${line}`,
              borderRadius: '10px',
              px: 1.75,
              py: 1.125,
              fontSize: 13,
              color: muted,
              '&:hover': { color: 'text.primary' },
            }}
          >
            Copy as text
          </ButtonBase>
          <Typography sx={{ ml: 'auto', fontSize: 12, color: muted }}>
            Saved to Supabase — the same list on every device.
          </Typography>
        </Foot>
      </Wrap>

      {toast && (
        <Toast>
          <span>{toast}</span>
          {undoTarget && (
            <ButtonBase
              onClick={handleUndo}
              sx={{ color: '#A9414D', fontSize: 13, fontWeight: 700 }}
            >
              Undo
            </ButtonBase>
          )}
        </Toast>
      )}

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={clearError} sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
      </Snackbar>
    </PageRoot>
  );
}

function EmptyState({ starredOnly, filtered }: { starredOnly: boolean; filtered: boolean }) {
  return (
    <EmptyCard>
      <Box
        sx={{
          width: 56,
          height: 56,
          mx: 'auto',
          mb: 1.5,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: 'rgba(224,168,175,.25)',
          color: roseInk,
        }}
      >
        {starredOnly ? <StarRoundedIcon /> : <TaskAltRoundedIcon />}
      </Box>
      <Typography variant="h2" sx={{ mb: 0.5 }}>
        {starredOnly ? 'Nothing starred' : filtered ? 'Nothing in this category' : 'All clear'}
      </Typography>
      <Typography sx={{ color: muted }}>
        {starredOnly
          ? 'Star a job to have it show up here.'
          : filtered
            ? 'Switch back to All, or add a job above.'
            : 'Add a job above and it lands at the top.'}
      </Typography>
    </EmptyCard>
  );
}

function readView(): View {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return DEFAULT_VIEW;
    const parsed = JSON.parse(raw) as Partial<View>;
    return {
      // A category saved before the list was re-cut would filter out everything.
      areaFilter: isArea(parsed.areaFilter) ? parsed.areaFilter : null,
      starredOnly: parsed.starredOnly === true,
      showDone: parsed.showDone === true,
    };
  } catch {
    return DEFAULT_VIEW;
  }
}

function writeView(view: View): void {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    /* ignore — the board still works, it just won't remember the view */
  }
}
