'use client';

import { useFormStatus } from 'react-dom';
import { Box, Button, CssBaseline, TextField, ThemeProvider, Typography } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { adminTheme, muted, page, rose, roseDeep, roseInk, softShadow } from './adminTheme';

type PinGateProps = {
  /** Server action: sets the board cookie on a match, comes back with `?pin=wrong` otherwise. */
  action: (formData: FormData) => Promise<void>;
  wrong: boolean;
  /** No PIN configured in production — the board stays shut until one is set. */
  locked: boolean;
};

/** What /admin shows before the PIN is entered, in the board's own colours. */
export default function PinGate({ action, wrong, locked }: PinGateProps) {
  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: page,
          px: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: rose,
            border: `1px solid ${roseDeep}`,
            borderRadius: 5,
            boxShadow: softShadow,
            p: { xs: 3, sm: 4 },
            textAlign: 'center',
          }}
        >
          <LockRoundedIcon sx={{ color: roseInk, fontSize: 28, mb: 1 }} />
          <Typography variant="overline" component="p" sx={{ color: roseInk }}>
            Easy Beans Coffee
          </Typography>
          <Typography variant="h1" component="h1" sx={{ fontSize: 28, mt: 0.5, mb: 2.5 }}>
            Task board
          </Typography>

          {locked ? (
            <Typography sx={{ color: muted }}>
              The board is locked until a PIN is set (ADMIN_BOARD_PIN).
            </Typography>
          ) : (
            <form action={action}>
              <TextField
                name="pin"
                label="PIN"
                type="password"
                autoComplete="current-password"
                autoFocus
                fullWidth
                required
                error={wrong}
                helperText={wrong ? 'That PIN didn’t match. Try again.' : ' '}
              />
              <OpenButton />
            </form>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

/** Its own component so it can read the form's pending state. */
function OpenButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      color="secondary"
      fullWidth
      disabled={pending}
      sx={{ mt: 1, py: 1.25 }}
    >
      {pending ? 'Checking…' : 'Open the board'}
    </Button>
  );
}
