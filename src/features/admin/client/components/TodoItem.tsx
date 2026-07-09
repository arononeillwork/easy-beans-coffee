import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { TaskCard } from '../styled';
import AssigneeBadge from './AssigneeBadge';
import type { Assignee, Todo, TodoUpdate } from '../../todoModel';

type TodoItemProps = {
  todo: Todo;
  draggable: boolean;
  onToggleCompleted: (id: string, completed: boolean) => void;
  onToggleImportant: (id: string, important: boolean) => void;
  onSetAssignee: (id: string, assignee: Assignee | null) => void;
  onEdit: (id: string, updates: TodoUpdate) => void;
  onDelete: (id: string) => void;
};

export default function TodoItem({
  todo,
  draggable,
  onToggleCompleted,
  onToggleImportant,
  onSetAssignee,
  onEdit,
  onDelete,
}: TodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !draggable,
  });
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(todo.title);
  const [categoryDraft, setCategoryDraft] = useState(todo.category ?? '');

  const style = { transform: CSS.Transform.toString(transform), transition };

  const startEditing = (): void => {
    setTitleDraft(todo.title);
    setCategoryDraft(todo.category ?? '');
    setEditing(true);
  };

  const saveEditing = (): void => {
    const title = titleDraft.trim();
    if (!title) return;
    onEdit(todo.id, { title, category: categoryDraft.trim() ? categoryDraft.trim() : null });
    setEditing(false);
  };

  const handleDelete = (): void => {
    onDelete(todo.id);
  };

  return (
    <TaskCard
      ref={setNodeRef}
      style={style}
      elevation={0}
      important={todo.important}
      completed={todo.completed}
      dragging={isDragging}
    >
      {draggable && (
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          sx={{ cursor: 'grab', touchAction: 'none', color: 'text.disabled', '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      )}

      <Checkbox
        checked={todo.completed}
        onChange={(e) => onToggleCompleted(todo.id, e.target.checked)}
        icon={<RadioButtonUncheckedIcon />}
        checkedIcon={<CheckCircleRoundedIcon />}
        color="success"
        aria-label={todo.completed ? 'Mark as not done' : 'Mark as done'}
        sx={{ p: 0.75 }}
      />

      {editing ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            flex: 1,
            alignItems: { sm: 'center' },
          }}
        >
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
          <TextField
            value={categoryDraft}
            onChange={(e) => setCategoryDraft(e.target.value)}
            size="small"
            placeholder="Category"
            sx={{ minWidth: { sm: 130 } }}
          />
          <Box sx={{ display: 'flex', gap: 0.5, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <IconButton size="small" color="primary" onClick={saveEditing} aria-label="Save">
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setEditing(false)} aria-label="Cancel">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, minWidth: 0 }} onDoubleClick={startEditing}>
          <Typography
            sx={{
              fontWeight: 500,
              lineHeight: 1.3,
              wordBreak: 'break-word',
              textDecoration: todo.completed ? 'line-through' : 'none',
              color: todo.completed ? 'text.disabled' : 'text.primary',
              transition: 'color .18s ease',
            }}
          >
            {todo.title}
          </Typography>
          {todo.category ? (
            <Chip
              label={todo.category}
              size="small"
              sx={{
                mt: 0.75,
                maxWidth: '100%',
                height: 24,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 999,
                bgcolor: 'rgba(217,154,78,0.16)',
                color: 'secondary.dark',
                '& .MuiChip-label': { px: 1.25 },
              }}
            />
          ) : null}
        </Box>
      )}

      {!editing && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssigneeBadge
            value={todo.assignee}
            onChange={(assignee) => onSetAssignee(todo.id, assignee)}
          />
          <Tooltip title={todo.important ? 'Remove importance' : 'Mark as important'}>
            <IconButton
              size="small"
              onClick={() => onToggleImportant(todo.id, !todo.important)}
              aria-label="Toggle important"
              sx={{ color: todo.important ? 'secondary.main' : 'text.disabled' }}
            >
              {todo.important ? <StarRoundedIcon fontSize="small" /> : <StarBorderRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={startEditing}
              aria-label="Edit task"
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={handleDelete}
              aria-label="Delete task"
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </TaskCard>
  );
}
