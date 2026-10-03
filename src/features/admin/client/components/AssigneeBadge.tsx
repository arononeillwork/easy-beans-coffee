import { useState, type MouseEvent } from 'react';
import { Avatar, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { ASSIGNEES, isAssignee, type Assignee } from '../../taskModel';
import { matcha } from '../adminTheme';

/**
 * One colour per person so the two "M" names (Mark / Maria) stay apart. These
 * sit off the board's signal colours — matcha, amber and lilac all mean
 * something here, so nobody's initial borrows them.
 */
const ASSIGNEE_COLORS: Record<Assignee, string> = {
  Aron: '#7A4E55',
  Mark: '#4A6B7C',
  Julio: '#5C7A4A',
  Maria: '#8E6BA8',
};

type AssigneeBadgeProps = {
  value: string | null | undefined;
  onChange: (assignee: Assignee | null) => void;
};

export default function AssigneeBadge({ value, onChange }: AssigneeBadgeProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = isAssignee(value) ? value : null;

  const openMenu = (e: MouseEvent<HTMLElement>): void => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const pick = (assignee: Assignee | null): void => {
    setAnchorEl(null);
    onChange(assignee);
  };

  return (
    <>
      <Tooltip title={current ? `Assigned to ${current}` : 'Assign someone'}>
        <Avatar
          onClick={openMenu}
          aria-label={current ? `Assigned to ${current}, change` : 'Assign job'}
          sx={{
            width: 26,
            height: 26,
            mr: 0.25,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            bgcolor: current ? ASSIGNEE_COLORS[current] : 'transparent',
            color: current ? '#fff' : '#BFC9C2',
            border: current ? 'none' : '1.5px dashed #CBD5CE',
            transition: 'transform .15s ease',
            '&:hover': { transform: 'scale(1.08)' },
          }}
        >
          {current ? current.charAt(0) : <PersonOutlineRoundedIcon sx={{ fontSize: 15 }} />}
        </Avatar>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 0.5 } } }}
      >
        {ASSIGNEES.map((name) => (
          <MenuItem key={name} selected={current === name} onClick={() => pick(name)}>
            <ListItemIcon sx={{ minWidth: 'auto' }}>
              <Avatar
                sx={{
                  width: 22,
                  height: 22,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: ASSIGNEE_COLORS[name],
                  color: '#fff',
                }}
              >
                {name.charAt(0)}
              </Avatar>
            </ListItemIcon>
            <ListItemText>{name}</ListItemText>
            {current === name && <CheckRoundedIcon sx={{ fontSize: 16, color: matcha, ml: 1 }} />}
          </MenuItem>
        ))}
        <MenuItem onClick={() => pick(null)} disabled={!current}>
          <ListItemIcon sx={{ minWidth: 'auto' }}>
            <PersonOutlineRoundedIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText>Unassigned</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
