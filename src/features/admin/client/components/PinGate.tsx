import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { clientConfig } from '@/shared/lib/clientConfig';
import { headerGradient } from '../adminTheme';
import { GateRoot } from '../styled';

export default function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PinForm>({ resolver: zodResolver(pinSchema), defaultValues: { pin: '' } });

  const onSubmit = (data: PinForm): void => {
    if (data.pin === clientConfig.adminPin) {
      onUnlock();
      return;
    }
    setError('pin', { message: 'Incorrect PIN' });
    reset();
  };

  return (
    <GateRoot>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          width: '100%',
          maxWidth: 380,
          textAlign: 'center',
          borderRadius: 4,
          border: '1px solid rgba(111,78,55,0.08)',
          boxShadow: '0 24px 60px rgba(74,52,40,0.18)',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            borderRadius: '50%',
            background: headerGradient,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <LockOutlinedIcon />
        </Box>
        <Typography variant="h5">Easy Beans</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          Enter your PIN to manage tasks.
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('pin')}
            type="password"
            label="PIN"
            fullWidth
            autoFocus
            slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
            error={Boolean(errors.pin)}
            helperText={errors.pin?.message ?? ' '}
          />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={isSubmitting} sx={{ mt: 1 }}>
            Unlock
          </Button>
        </Box>
      </Paper>
    </GateRoot>
  );
}

const pinSchema = z.object({ pin: z.string().min(1, 'Enter the PIN') });

type PinForm = z.infer<typeof pinSchema>;
