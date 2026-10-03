import Box from '@mui/material/Box';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarHalfRoundedIcon from '@mui/icons-material/StarHalfRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import { brand } from '@/theme/brand';

/**
 * Five stars for a Google rating. `value === null` draws the empty row the
 * placeholder uses, so the section keeps its shape before the feed is wired up.
 */
export function Stars({
  value,
  size = 18,
  label,
}: {
  value: number | null;
  size?: number;
  label?: string;
}) {
  const rounded = value === null ? 0 : Math.round(value * 2) / 2;

  return (
    <Box
      role="img"
      aria-label={label}
      sx={{ display: 'inline-flex', alignItems: 'center', color: brand.rosePinkDeep }}
    >
      {[1, 2, 3, 4, 5].map((step) => {
        const Icon =
          rounded >= step
            ? StarRoundedIcon
            : rounded >= step - 0.5
              ? StarHalfRoundedIcon
              : StarOutlineRoundedIcon;
        return <Icon key={step} sx={{ fontSize: size }} />;
      })}
    </Box>
  );
}
