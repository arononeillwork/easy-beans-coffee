import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { brand } from '@/theme/brand';

/**
 * Title on the left, action on the right, hairline rule underneath — the
 * pattern the lower half of the home page repeats. Kept in one place so the
 * rule's colour and the baseline gap stay identical between sections.
 */
export function SectionHeading({
  eyebrow,
  title,
  action,
  id,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <Box sx={{ mb: { xs: 3.5, md: 5 } }}>
      {eyebrow ? (
        <Typography variant="h6" component="p" sx={{ color: brand.rosePinkDeep, mb: 1.5 }}>
          {eyebrow}
        </Typography>
      ) : null}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        justifyContent="space-between"
        sx={{ pb: 2 }}
      >
        <Typography
          id={id}
          variant="h2"
          sx={{ scrollMarginTop: 96, maxWidth: '28ch', textWrap: 'balance' }}
        >
          {title}
        </Typography>
        {action ? <Box sx={{ flexShrink: 0, pb: { sm: 0.5 } }}>{action}</Box> : null}
      </Stack>
      <Box sx={{ height: '1px', backgroundColor: brand.rosePink, opacity: 0.55 }} />
    </Box>
  );
}
