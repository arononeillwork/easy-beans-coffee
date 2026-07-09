import { useState, type MouseEvent } from 'react';
import { Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { ASSIGNEES, type Assignee } from '../../todoModel';

/** Distinct colour per person so the two "M" names (Mark / Maria) stay readable. */
const ASSIGNEE_COLORS: Record<Assignee, string> = {
  Aron: '#6f4e37',
  Mark: '#3b7ea1',
  Julio: '#4b9560',
  Maria: '#c65b7c',
};

type AssigneeBadgeProps = {
  value: string | null | undefined;
  onChange: (assignee: Assignee | null) => void;
};

function isAssignee(value: string | null | undefined): value is Assignee {
  return !!value && (ASSIGNEES as readonly string[]).includes(value);
}

export default function AssigneeBadge({ value, onChange }: AssigneeBadgeProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const current = isAssignee(value) ? value : null;

  const openMenu = (e: MouseEvent<HTMLElement>): void => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const closeMenu = (): void => setAnchorEl(null);

  const pick = (assignee: Assignee | null): void => {
    onChange(assignee);
    closeMenu();
  };

  return (
    <>
      <Tooltip title={current ? `Assigned to ${current}` : 'Assign someone'}>
        <Avatar
          onClick={openMenu}
          aria-label={current ? `Assigned to ${current}, change` : 'Assign task'}
          sx={{
            width: 28,
            height: 28,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            bgcolor: current ? ASSIGNEE_COLORS[current] : 'transparent',
            color: current ? '#fff' : 'text.disabled',
            border: current ? 'none' : '1.5px dashed rgba(111,78,55,0.35)',
            transition: 'transform .15s ease, box-shadow .15s ease',
            '&:hover': { transform: 'scale(1.08)', boxShadow: '0 2px 8px rgba(111,78,55,0.25)' },
          }}
        >
          {current ? current.charAt(0) : <PersonOutlineRoundedIcon sx={{ fontSize: 16 }} />}
        </Avatar>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 168, mt: 0.5 } } }}
      >
        {ASSIGNEES.map((name) => (
          <MenuItem key={name} selected={current === name} onClick={() => pick(name)}>
            <ListItemIcon>
              <Avatar sx={{ width: 24, height: 24, fontSize: 12, fontWeight: 700, bgcolor: ASSIGNEE_COLORS[name], color: '#fff' }}>
                {name.charAt(0)}
              </Avatar>
            </ListItemIcon>
            <ListItemText>{name}</ListItemText>
            {current === name && <CheckIcon fontSize="small" sx={{ color: 'success.main', ml: 1 }} />}
          </MenuItem>
        ))}
        <MenuItem onClick={() => pick(null)} disabled={!current}>
          <ListItemIcon>
            <PersonOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Unassigned</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
