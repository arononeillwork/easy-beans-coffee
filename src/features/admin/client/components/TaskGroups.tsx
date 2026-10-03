import { Fragment } from 'react';
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Box, Typography } from '@mui/material';
import TaskRow from './TaskRow';
import { GroupHead, GroupPanel, SubHead } from '../styled';
import { tintOf } from '../adminTheme';
import { flattenBoard, resolveMove, type BoardGroup } from '../lib/board';
import type { Assignee, TaskId, TaskUpdate } from '../../taskModel';
import type { TaskMove } from '../hooks/useTasks';

type TaskGroupsProps = {
  groups: BoardGroup[];
  onMove: (id: TaskId, move: TaskMove) => void;
  onToggleCompleted: (id: TaskId, completed: boolean) => void;
  onToggleImportant: (id: TaskId, important: boolean) => void;
  onTogglePinned: (id: TaskId, pinned: boolean) => void;
  onSetArea: (id: TaskId, area: string) => void;
  onSetAssignee: (id: TaskId, assignee: Assignee | null) => void;
  onEdit: (id: TaskId, updates: TaskUpdate) => void;
  onDelete: (id: TaskId) => void;
};

/**
 * The list itself. One drag context spans every group, so a job can be dragged
 * from one category straight into another — it takes on the group it's dropped into.
 */
export default function TaskGroups({ groups, onMove, ...rowHandlers }: TaskGroupsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const displayOrder = flattenBoard(groups);

  // dnd-kit hands back whatever was passed as the sortable id, so these stay
  // numbers for our bigint keys — stringifying them here would stop them
  // matching `task.id` and the drop would be silently discarded.
  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return;
    const move = resolveMove(displayOrder, active.id, over.id);
    if (move) onMove(active.id, move);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={displayOrder.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        {groups.map((group) => {
          const tint = tintOf(group.key);
          return (
            <GroupPanel
              component="section"
              key={group.key}
              style={
                {
                  '--groupBg': tint.bg,
                  '--groupEdge': tint.edge,
                  '--groupInk': tint.ink,
                } as React.CSSProperties
              }
            >
              <GroupHead>
                <Typography variant="h2" sx={{ color: 'inherit' }}>
                  {group.label}
                </Typography>
                <Box
                  component="span"
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: 'inherit',
                    backgroundColor: 'var(--groupEdge)',
                    borderRadius: 999,
                    px: 1,
                    py: '2px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {group.count}
                </Box>
                {group.why && (
                  <Typography
                    sx={{
                      ml: 'auto',
                      fontSize: 12,
                      color: 'inherit',
                      opacity: 0.75,
                      display: { xs: 'none', sm: 'block' },
                    }}
                  >
                    {group.why}
                  </Typography>
                )}
              </GroupHead>

              {group.sections.map((section) => (
                <Fragment key={`${group.key}:${section.key}`}>
                  {section.label && <SubHead>{section.label}</SubHead>}
                  {section.items.map((task) => (
                    <TaskRow key={task.id} task={task} draggable {...rowHandlers} />
                  ))}
                </Fragment>
              ))}
            </GroupPanel>
          );
        })}
      </SortableContext>
    </DndContext>
  );
}
