import { Box, ButtonBase, FormControlLabel, Switch, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { Bar } from '../styled';
import { amber, areaColor, card, ink, line, matcha, muted, tintOf } from '../adminTheme';
import { AREAS } from '../../taskModel';

type BoardControlsProps = {
  areaFilter: string | null;
  onAreaFilterChange: (value: string | null) => void;
  starredOnly: boolean;
  onStarredOnlyChange: (value: boolean) => void;
  showDone: boolean;
  onShowDoneChange: (value: boolean) => void;
  starredCount: number;
  /** Jobs each category chip would show, keyed by category; `all` is the total. */
  areaCounts: Record<string, number>;
};

/** Sticky bar: whether to filter to starred, show done jobs, and which category to show. */
export default function BoardControls({
  areaFilter,
  onAreaFilterChange,
  starredOnly,
  onStarredOnlyChange,
  showDone,
  onShowDoneChange,
  starredCount,
  areaCounts,
}: BoardControlsProps) {
  return (
    <Bar>
      <ButtonBase
        onClick={() => onStarredOnlyChange(!starredOnly)}
        aria-pressed={starredOnly}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          border: `1px solid ${starredOnly ? amber : line}`,
          backgroundColor: starredOnly ? 'rgba(222,147,39,.12)' : card,
          color: starredOnly ? '#A96A14' : muted,
          borderRadius: 999,
          px: 1.25,
          py: 0.75,
          fontSize: 13,
          fontWeight: starredOnly ? 600 : 400,
        }}
      >
        <StarRoundedIcon sx={{ fontSize: 16, color: starredOnly ? amber : 'inherit' }} />
        Starred
        {starredCount > 0 && (
          <Typography component="span" sx={{ fontSize: 12, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
            {starredCount}
          </Typography>
        )}
      </ButtonBase>

      <FormControlLabel
        // On a phone the switch takes its own line rather than being squeezed
        // off the edge next to the starred filter.
        sx={{
          ml: { xs: 0, sm: 'auto' },
          mr: 0,
          flex: { xs: '1 0 100%', sm: '0 0 auto' },
        }}
        control={
          <Switch
            size="small"
            checked={showDone}
            onChange={(e) => onShowDoneChange(e.target.checked)}
            inputProps={{ 'aria-label': 'Show done' }}
            sx={{
              '& .Mui-checked': { color: matcha },
              '& .Mui-checked + .MuiSwitch-track': { backgroundColor: `${matcha} !important` },
            }}
          />
        }
        label={
          <Typography sx={{ fontSize: 13, color: muted }}>Show done</Typography>
        }
      />

      <Box
        role="group"
        aria-label="Filter by category"
        // Chips wrap rather than scroll, so every category is visible at once.
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, width: '100%' }}
      >
        <Chip
          selected={areaFilter === null}
          onClick={() => onAreaFilterChange(null)}
          count={areaCounts.all ?? 0}
        >
          All
        </Chip>
        {AREAS.map((area) => (
          <Chip
            key={area.key}
            selected={areaFilter === area.key}
            // Tapping the selected chip again clears the filter.
            onClick={() => onAreaFilterChange(areaFilter === area.key ? null : area.key)}
            count={areaCounts[area.key] ?? 0}
            colorKey={area.key}
          >
            {area.label}
          </Chip>
        ))}
      </Box>
    </Bar>
  );
}

/**
 * A category filter. Each one wears its category's tint, so the row reads as a
 * colour key; the selected one fills with the category's deep ink. `All` has no
 * category and stays neutral.
 */
function Chip({
  selected,
  onClick,
  count,
  colorKey,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  count: number;
  colorKey?: string;
  children: React.ReactNode;
}) {
  const tint = colorKey
    ? tintOf(colorKey)
    : { bg: card, edge: line, ink: ink };
  const dot = colorKey ? areaColor[colorKey] : undefined;

  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        border: `1px solid ${selected ? tint.ink : tint.edge}`,
        backgroundColor: selected ? tint.ink : tint.bg,
        color: selected ? '#FFFFFF' : tint.ink,
        fontWeight: 600,
        borderRadius: 999,
        pl: dot ? 1.125 : 1.5,
        pr: 1.25,
        py: 0.75,
        fontSize: 13,
        whiteSpace: 'nowrap',
        // A chip with nothing in it stays tappable but steps back.
        opacity: count === 0 && !selected ? 0.55 : 1,
        transition: 'background-color .15s, color .15s, border-color .15s',
        '&:hover': { borderColor: tint.ink },
      }}
    >
      {dot && (
        <Box
          component="span"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            flex: 'none',
            backgroundColor: selected ? '#FFFFFF' : dot,
          }}
        />
      )}
      {children}
      <Box
        component="span"
        sx={{ fontSize: 12, fontWeight: 500, opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}
      >
        {count}
      </Box>
    </ButtonBase>
  );
}
