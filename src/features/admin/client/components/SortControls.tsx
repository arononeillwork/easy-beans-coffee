import type { MouseEvent } from 'react';
import { Box, ToggleButton, Typography } from '@mui/material';
import SortRoundedIcon from '@mui/icons-material/SortRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LabelRoundedIcon from '@mui/icons-material/LabelRounded';
import { SegmentedGroup } from '../styled';
import { SortMode, type SortModeValue } from '../../todoModel';

type SortControlsProps = {
  sortMode: SortModeValue;
  count: number;
  onChange: (mode: SortModeValue) => void;
};

export default function SortControls({ sortMode, count, onChange }: SortControlsProps) {
  const handleChange = (_: MouseEvent<HTMLElement>, value: SortModeValue | null): void => {
    if (value) onChange(value);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        mb: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        {count} active
      </Typography>
      <SegmentedGroup value={sortMode} exclusive onChange={handleChange} size="small" aria-label="Sort tasks">
        <ToggleButton value={SortMode.Manual} aria-label="My order">
          <SortRoundedIcon fontSize="small" />
          <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>
            My order
          </Box>
        </ToggleButton>
        <ToggleButton value={SortMode.Important} aria-label="Important">
          <StarRoundedIcon fontSize="small" />
          <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>
            Important
          </Box>
        </ToggleButton>
        <ToggleButton value={SortMode.Category} aria-label="Category">
          <LabelRoundedIcon fontSize="small" />
          <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>
            Category
          </Box>
        </ToggleButton>
      </SegmentedGroup>
    </Box>
  );
}
