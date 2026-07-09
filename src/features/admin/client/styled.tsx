import type { ComponentType, ElementType, FormEventHandler } from 'react';
import { Box, IconButton, Paper, ToggleButtonGroup, styled, type PaperProps } from '@mui/material';
import {
  accentGradient,
  glassBg,
  glassBorder,
  headerGradient,
  hoverShadow,
  pageGradient,
  softShadow,
} from './adminTheme';

/** Full-page warm gradient backdrop. */
export const PageRoot = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: pageGradient,
  paddingBottom: theme.spacing(10),
}));

/** Sticky frosted-glass top bar. */
export const GlassHeader = styled('header')({
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  background: glassBg,
  borderBottom: glassBorder,
});

/** Small rounded brand logo tile with the espresso gradient. */
export const BrandMark = styled(Box)({
  width: 38,
  height: 38,
  borderRadius: 12,
  background: headerGradient,
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
});

/** Caramel-gradient circular action button (e.g. "add task"). */
export const AccentButton = styled(IconButton)({
  width: 44,
  height: 44,
  flexShrink: 0,
  color: '#fff',
  background: accentGradient,
  boxShadow: '0 4px 12px rgba(200,130,58,0.4)',
  transition: 'transform .15s ease, box-shadow .15s ease',
  '&:hover': { boxShadow: '0 6px 18px rgba(200,130,58,0.5)', transform: 'translateY(-1px)' },
  '&.Mui-disabled': { background: 'rgba(111,78,55,0.18)', color: 'rgba(255,255,255,0.6)' },
});

/** Elevated surface used for the add-task form (rendered as a `<form>`). */
export const SurfaceCard = styled(Paper)({
  borderRadius: 20,
  boxShadow: softShadow,
  border: '1px solid rgba(111,78,55,0.08)',
}) as ComponentType<PaperProps & { component?: ElementType; onSubmit?: FormEventHandler }>;

/** A single task row. `important` adds the caramel accent rail; `dragging` lifts it; `completed` dims it. */
export const TaskCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'important' && prop !== 'dragging' && prop !== 'completed',
})<{ important?: boolean; dragging?: boolean; completed?: boolean }>(({ theme, important, dragging, completed }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: theme.spacing(1, 1.5),
  marginBottom: theme.spacing(1.25),
  borderRadius: 16,
  backgroundColor: completed ? 'rgba(255,253,248,0.55)' : theme.palette.background.paper,
  border: '1px solid rgba(111,78,55,0.06)',
  borderLeft: `3px solid ${important && !completed ? theme.palette.secondary.main : 'transparent'}`,
  boxShadow: dragging ? hoverShadow : completed ? 'none' : softShadow,
  opacity: dragging ? 0.96 : completed ? 0.72 : 1,
  transition: 'box-shadow .18s ease, opacity .18s ease, border-color .18s ease, background-color .18s ease',
  '&:hover': { boxShadow: completed ? softShadow : hoverShadow },
}));

/** Pill-style segmented control for the sort modes. */
export const SegmentedGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: 999,
  padding: 4,
  boxShadow: softShadow,
  '& .MuiToggleButton-root': {
    border: 'none',
    borderRadius: 999,
    padding: theme.spacing(0.5, 1.5),
    color: theme.palette.text.secondary,
    '&.Mui-selected': {
      color: '#fff',
      background: headerGradient,
      '&:hover': { background: headerGradient },
    },
  },
}));

/** Dashed friendly container for the empty state. */
export const EmptyCard = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  padding: theme.spacing(6, 3),
  textAlign: 'center',
  borderRadius: 24,
  border: '1px dashed rgba(111,78,55,0.25)',
  backgroundColor: 'rgba(255,253,248,0.5)',
}));
