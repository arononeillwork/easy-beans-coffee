import { Box, ButtonBase, Paper, styled } from '@mui/material';
import {
  card,
  line,
  lilac,
  matcha,
  muted,
  page,
  priorityColor,
  rose,
  roseDeep,
  roseInk,
  roseMid,
  slate,
  softShadow,
  hoverShadow,
} from './adminTheme';

/** Page backdrop. Bottom padding leaves room for the undo toast. */
export const PageRoot = styled(Box)({
  minHeight: '100vh',
  backgroundColor: page,
  padding: '16px 14px 104px',
});

export const Wrap = styled(Box)({ maxWidth: 780, margin: '0 auto' });

/** Rose hero holding the date, the headline and the counts. */
export const Hero = styled(Box)({
  backgroundColor: rose,
  backgroundImage:
    'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,.75), transparent 62%)',
  borderRadius: 22,
  padding: '18px 20px 22px',
  marginBottom: 14,
});

/**
 * The control bar. Its wrapper in TaskBoard is what sticks — and what --barH is
 * measured from, so group headers can pin directly below it.
 */
export const Bar = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 10,
  backgroundColor: page,
  padding: '10px 0',
});

/**
 * The tinted note a category's jobs sit on. Carries the group's colours as CSS
 * variables so the header and sub-headings inside pick them up.
 *
 * Deliberately no `overflow` — clipping here would stop the header sticking.
 */
export const GroupPanel = styled(Box)<{ component?: React.ElementType }>({
  backgroundColor: 'var(--groupBg)',
  border: '1px solid var(--groupEdge)',
  borderRadius: 18,
  padding: '0 10px 3px',
  marginBottom: 14,
});

/**
 * The group's title. Sticks below the control bar for as long as its own panel
 * is on screen, then the next group's title pushes it out of the way — so the
 * heading at the top is always the one you're reading.
 */
export const GroupHead = styled(Box)({
  position: 'sticky',
  top: 'var(--barH, 58px)',
  zIndex: 5,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  // Pulled out to the panel's edges, and rounded to sit inside its border.
  margin: '0 -10px 7px',
  padding: '9px 13px',
  backgroundColor: 'var(--groupBg, ' + page + ')',
  borderBottom: '1px solid var(--groupEdge, ' + line + ')',
  borderRadius: '17px 17px 0 0',
  color: 'var(--groupInk, inherit)',
});

/** Uppercase sub-heading inside an area group, with a rule running off to the right. */
export const SubHead = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '14px 0 7px',
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--groupInk, ' + muted + ')',
  opacity: 0.8,
  '&::after': {
    content: '""',
    flex: 1,
    height: 1,
    backgroundColor: 'var(--groupEdge, ' + line + ')',
  },
});

/**
 * A job. The left rail carries its priority colour; a pin swaps the border for
 * a lilac outline so pinned work is obvious at a glance without shouting.
 */
export const TaskCard = styled(Paper, {
  shouldForwardProp: (prop) =>
    prop !== 'priority' && prop !== 'pinned' && prop !== 'completed' && prop !== 'dragging',
})<{ priority?: string; pinned?: boolean; completed?: boolean; dragging?: boolean }>(
  ({ priority, pinned, completed, dragging }) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: card,
    border: `1px solid ${pinned ? lilac : line}`,
    outline: pinned ? `2px solid ${lilac}` : 'none',
    outlineOffset: pinned ? -3 : 0,
    borderRadius: 14,
    padding: '12px 12px 12px 10px',
    marginBottom: 7,
    boxShadow: dragging ? hoverShadow : softShadow,
    opacity: dragging ? 0.96 : completed ? 0.5 : 1,
    transition: 'opacity .18s ease, box-shadow .18s ease, border-color .18s ease',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 12,
      bottom: 12,
      width: 3,
      borderRadius: '0 3px 3px 0',
      backgroundColor: priorityColor[priority ?? ''] ?? slate,
    },
    '&:hover': { boxShadow: completed ? softShadow : hoverShadow },
  }),
);

/** Round-cornered outline pill. Used for area / priority dropdowns and section tags. */
export const Pill = styled(ButtonBase)<{ component?: React.ElementType }>({
  border: `1px solid ${line}`,
  backgroundColor: card,
  borderRadius: 999,
  padding: '5px 11px 5px 9px',
  fontSize: 12.5,
  color: muted,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
  '&:hover': { borderColor: '#C9D3CB', color: 'inherit' },
});

/** Same shape as Pill but static — for a section tag that isn't a control. */
export const TagPill = styled(Box)({
  border: `1px solid ${line}`,
  backgroundColor: card,
  borderRadius: 999,
  padding: '5px 11px',
  fontSize: 12.5,
  color: muted,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
});

/** Rose call-to-action, matching the site's primary button. */
export const AddButton = styled(ButtonBase)<{ component?: React.ElementType }>({
  border: `1px solid ${roseDeep}`,
  backgroundColor: roseMid,
  borderRadius: 12,
  padding: '12px 20px',
  fontSize: 14,
  fontWeight: 600,
  boxShadow: softShadow,
  '&:hover': { backgroundColor: roseDeep },
  '&.Mui-disabled': { opacity: 0.55 },
});

/** Round checkbox that fills matcha and draws a tick when the job is done. */
export const CheckBox = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'checked',
})<{ checked?: boolean }>(({ checked }) => ({
  flex: 'none',
  width: 20,
  height: 20,
  marginTop: 1,
  border: `2px solid ${checked ? matcha : '#C3CEC6'}`,
  backgroundColor: checked ? matcha : 'transparent',
  borderRadius: 7,
  transition: 'background-color .15s, border-color .15s',
  '&:hover': { borderColor: matcha },
  '&::after': checked
    ? {
        content: '""',
        position: 'absolute',
        left: 5.5,
        top: 1.5,
        width: 4,
        height: 9,
        border: 'solid #fff',
        borderWidth: '0 2px 2px 0',
        transform: 'rotate(42deg)',
      }
    : {},
}));

export const EmptyCard = styled(Box)({
  marginTop: 8,
  padding: '40px 20px',
  textAlign: 'center',
  borderRadius: 22,
  border: `1px dashed ${roseDeep}`,
  backgroundColor: 'rgba(255,255,255,.5)',
});

export const Foot = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  borderTop: `1px solid ${line}`,
  paddingTop: 16,
  marginTop: 8,
});

export const Toast = styled(Box)({
  position: 'fixed',
  left: '50%',
  bottom: 20,
  transform: 'translateX(-50%)',
  zIndex: 60,
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  maxWidth: '92vw',
  backgroundColor: rose,
  border: `1px solid ${roseDeep}`,
  borderRadius: 999,
  padding: '10px 16px',
  fontSize: 13.5,
  color: roseInk,
  boxShadow: '0 12px 30px -12px rgba(122,78,85,.55)',
});
