import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Fragment } from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import TodoItem from './TodoItem';
import type { Todo, TodoUpdate } from '../../todoModel';

type TodoListProps = {
  items: Todo[];
  draggable: boolean;
  onReorder: (ids: string[]) => void;
  onToggleCompleted: (id: string, completed: boolean) => void;
  onToggleImportant: (id: string, important: boolean) => void;
  onEdit: (id: string, updates: TodoUpdate) => void;
  onDelete: (id: string) => void;
};

export default function TodoList({
  items,
  draggable,
  onReorder,
  onToggleCompleted,
  onToggleImportant,
  onEdit,
  onDelete,
}: TodoListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex).map((t) => t.id));
  };

  const completedCount = items.filter((t) => t.completed).length;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <Box>
          {items.map((todo, index) => {
            const firstCompleted = todo.completed && (index === 0 || !items[index - 1].completed);
            return (
              <Fragment key={todo.id}>
                {firstCompleted && <CompletedDivider count={completedCount} />}
                <TodoItem
                  todo={todo}
                  draggable={draggable && !todo.completed}
                  onToggleCompleted={onToggleCompleted}
                  onToggleImportant={onToggleImportant}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </Fragment>
            );
          })}
        </Box>
      </SortableContext>
    </DndContext>
  );
}

function CompletedDivider({ count }: { count: number }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mt: 2,
        mb: 1.25,
        color: 'text.secondary',
      }}
    >
      <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Completed · {count}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
    </Box>
  );
}
