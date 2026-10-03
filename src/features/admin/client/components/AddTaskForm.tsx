import { useEffect, useState } from 'react';
import { Box, TextField } from '@mui/material';
import { AddButton } from '../styled';
import { areaColor, priorityColor } from '../adminTheme';
import SelectPill from './SelectPill';
import {
  AREAS,
  CreateTaskSchema,
  DEFAULT_AREA,
  DEFAULT_PRIORITY,
  PRIORITIES,
  type CreateTaskInput,
} from '../../taskModel';

type AddTaskFormProps = {
  onAdd: (input: CreateTaskInput) => Promise<void>;
  /** The board's category filter. While one is on, new jobs are filed under it. */
  areaFilter: string | null;
};

/** Compose bar: what the job is, which category it belongs to, how urgent it is. */
export default function AddTaskForm({ onAdd, areaFilter }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<string>(areaFilter ?? DEFAULT_AREA);
  const [priority, setPriority] = useState<string>(DEFAULT_PRIORITY);
  const [saving, setSaving] = useState(false);

  // Follow the filter chips: viewing "People" means a job added now is a People
  // job, not whatever was picked last. Back on All, the pill keeps its value.
  useEffect(() => {
    if (areaFilter) setArea(areaFilter);
  }, [areaFilter]);

  const parsed = CreateTaskSchema.safeParse({ title, area, priority });

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!parsed.success || saving) return;
    setSaving(true);
    await onAdd(parsed.data);
    setSaving(false);
    // Keep the category/priority pills where they are — jobs tend to arrive in runs.
    setTitle('');
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      autoComplete="off"
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1, mb: 2.5 }}
    >
      <TextField
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a job…"
        aria-label="New job"
        size="small"
        sx={{ flex: '1 1 220px', minWidth: 0, '& .MuiOutlinedInput-root': { boxShadow: 1 } }}
      />
      <SelectPill
        value={area}
        options={AREAS}
        onChange={setArea}
        dotColors={areaColor}
        size="large"
        ariaLabel="Category for the new job"
      />
      <SelectPill
        value={priority}
        options={PRIORITIES}
        onChange={setPriority}
        dotColors={priorityColor}
        size="large"
        ariaLabel="Priority for the new job"
      />
      <AddButton type="submit" component="button" disabled={!parsed.success || saving}>
        Add
      </AddButton>
    </Box>
  );
}
