import { useState, type MouseEvent } from 'react';
import { Box, Menu, MenuItem } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import { Pill } from '../styled';
import { matcha, slate } from '../adminTheme';

type Option = { readonly key: string; readonly label: string };

type SelectPillProps = {
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  /** Colour per option key; when given, each option carries a matching dot. */
  dotColors?: Record<string, string>;
  /** `large` is the compose bar; rows use the default. */
  size?: 'small' | 'large';
  ariaLabel: string;
};

/** A pill that opens a short list — the board's stand-in for a `<select>`. */
export default function SelectPill({
  value,
  options,
  onChange,
  dotColors,
  size = 'small',
  ariaLabel,
}: SelectPillProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const current = options.find((o) => o.key === value) ?? options[0];

  const openMenu = (e: MouseEvent<HTMLElement>): void => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const pick = (key: string): void => {
    setAnchorEl(null);
    if (key !== value) onChange(key);
  };

  return (
    <>
      <Pill
        onClick={openMenu}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        sx={size === 'large' ? { padding: '10px 14px', fontSize: 13.5, boxShadow: 1 } : undefined}
      >
        {dotColors && <Dot color={dotColors[value]} />}
        {current?.label}
        <ArrowDropDownRoundedIcon sx={{ fontSize: 16, opacity: 0.5, ml: -0.25 }} />
      </Pill>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.75 } } }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.key}
            selected={option.key === value}
            onClick={() => pick(option.key)}
          >
            {dotColors && <Dot color={dotColors[option.key]} size={8} />}
            {option.label}
            {option.key === value && (
              <CheckRoundedIcon sx={{ fontSize: 16, color: matcha, ml: 'auto' }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function Dot({ color, size = 7 }: { color: string | undefined; size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        flex: 'none',
        backgroundColor: color ?? slate,
      }}
    />
  );
}
