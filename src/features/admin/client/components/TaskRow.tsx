import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AssigneeBadge from './AssigneeBadge';
import SelectPill from './SelectPill';
import { CheckBox, TagPill, TaskCard } from '../styled';
import { amber, areaColor, lilacDeep, priorityColor, red } from '../adminTheme';
import {
  AREAS,
  PRIORITIES,
  toArea,
  toPriority,
  type Assignee,
  type Task,
  type TaskId,
  type TaskUpdate,
} from '../../taskModel';

type TaskRowProps = {
  task: Task;
  draggable: boolean;
  onToggleCompleted: (id: TaskId, completed: boolean) => void;
  onToggleImportant: (id: TaskId, important: boolean) => void;
  onTogglePinned: (id: TaskId, pinned: boolean) => void;
  onSetArea: (id: TaskId, area: string) => void;
  onSetPriority: (id: TaskId, priority: string) => void;
  onSetAssignee: (id: TaskId, assignee: Assignee | null) => void;
  onEdit: (id: TaskId, updates: TaskUpdate) => void;
  onDelete: (id: TaskId) => void;
};

export default function TaskRow({
  task,
  draggable,
  onToggleCompleted,
  onToggleImportant,
  onTogglePinned,
  onSetArea,
  onSetPriority,
  onSetAssignee,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
  });
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [sectionDraft, setSectionDraft] = useState(task.section ?? '');

  const startEditing = (): void => {
    setTitleDraft(task.title);
    setSectionDraft(task.section ?? '');
    setEditing(true);
  };

  const saveEditing = (): void => {
    const title = titleDraft.trim();
    if (!title) return;
    onEdit(task.id, { title, section: sectionDraft.trim() || null });
    setEditing(false);
  };

  return (
    <TaskCard
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      elevation={0}
      priority={toPriority(task.priority)}
      pinned={task.pinned}
      completed={task.completed}
      dragging={isDragging}
    >
      <IconButton
        size="small"
        {...attributes}
        {...listeners}
        disabled={!draggable}
        aria-label="Drag to reorder"
        sx={{
          cursor: 'grab',
          touchAction: 'none',
          color: '#BFC9C2',
          p: 0.25,
          '&:active': { cursor: 'grabbing' },
          '&.Mui-disabled': { color: '#DDE4DF' },
        }}
      >
        <DragIndicatorRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>

      <CheckBox
        checked={task.completed}
        onClick={() => onToggleCompleted(task.id, !task.completed)}
        aria-pressed={task.completed}
        aria-label={task.completed ? 'Mark as not done' : 'Mark as done'}
      />

      {editing ? (
        <Box sx={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            size="small"
            fullWidth
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEditing();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              value={sectionDraft}
              onChange={(e) => setSectionDraft(e.target.value)}
              size="small"
              placeholder="Section (optional)"
              sx={{ flex: 1 }}
            />
            <IconButton size="small" onClick={saveEditing} aria-label="Save">
              <CheckRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={() => setEditing(false)} aria-label="Cancel">
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }} onDoubleClick={startEditing}>
          <Typography
            sx={{
              wordBreak: 'break-word',
              lineHeight: 1.4,
              textDecoration: task.completed ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </Typography>

          {/* Tags and controls share the line under the title, so even a narrow
              phone gives the job's own words the full width of the card. */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.625, mt: 0.875 }}>
            <SelectPill
              value={toArea(task.area)}
              options={AREAS}
              onChange={(value) => onSetArea(task.id, value)}
              dotColors={areaColor}
              ariaLabel="Change category"
            />
            <SelectPill
              value={toPriority(task.priority)}
              options={PRIORITIES}
              onChange={(value) => onSetPriority(task.id, value)}
              dotColors={priorityColor}
              ariaLabel="Change priority"
            />
            {task.section ? <TagPill>{task.section}</TagPill> : null}

            <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
              <AssigneeBadge value={task.assignee} onChange={(a) => onSetAssignee(task.id, a)} />
              <Tooltip title={task.important ? 'Remove star' : 'Star this job'}>
                <IconButton
                  size="small"
                  onClick={() => onToggleImportant(task.id, !task.important)}
                  aria-label="Toggle star"
                  aria-pressed={task.important}
                  sx={{ p: 0.5, color: task.important ? amber : '#BFC9C2' }}
                >
                  {task.important ? (
                    <StarRoundedIcon sx={{ fontSize: 19 }} />
                  ) : (
                    <StarBorderRoundedIcon sx={{ fontSize: 19 }} />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title={task.pinned ? 'Unpin' : 'Pin to the top'}>
                <IconButton
                  size="small"
                  onClick={() => onTogglePinned(task.id, !task.pinned)}
                  aria-label="Toggle pin"
                  aria-pressed={task.pinned}
                  sx={{ p: 0.5, color: task.pinned ? lilacDeep : '#BFC9C2' }}
                >
                  {task.pinned ? (
                    <PushPinRoundedIcon sx={{ fontSize: 17 }} />
                  ) : (
                    <PushPinOutlinedIcon sx={{ fontSize: 17 }} />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Rename">
                <IconButton
                  size="small"
                  onClick={startEditing}
                  aria-label="Rename job"
                  sx={{ p: 0.5, color: '#BFC9C2' }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={() => onDelete(task.id)}
                  aria-label="Delete job"
                  sx={{ p: 0.5, color: '#BFC9C2', '&:hover': { color: red } }}
                >
                  <DeleteOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      )}
    </TaskCard>
  );
}
