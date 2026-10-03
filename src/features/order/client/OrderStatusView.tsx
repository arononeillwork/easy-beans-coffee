'use client';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { useLanguage } from '@/i18n/LanguageProvider';
import { brand } from '@/theme/brand';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { formatEuros } from '../lib/price';
import { formatSlotLabel } from '../lib/pickupTimes';

const CAFE_TZ = 'Europe/Madrid';

interface Props {
  token: string | null;
  /** Confirmation page shows full receipt details; status page is compact. */
  detailed?: boolean;
}

export function OrderStatusView({ token, detailed = false }: Props) {
  const { t } = useLanguage();
  const { data, notFound } = useOrderStatus(token);

  if (!token || notFound) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <Typography color="text.secondary">{t.errors.generic}</Typography>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <CircularProgress color="secondary" aria-label={t.order.confirmingPayment} />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          {t.order.confirmingPayment}
        </Typography>
      </Container>
    );
  }

  const isReady = data.status === 'ready';
  const isPaidState = !['awaiting_payment', 'failed', 'cancelled'].includes(data.status);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 9 } }}>
      {/* Screen readers announce status changes without a refresh. */}
      <Box aria-live="polite">
        {data.status === 'awaiting_payment' && (
          <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', mb: 4 }}>
            <CircularProgress color="secondary" size={32} />
            <Typography variant="h4">{t.order.confirmingPayment}</Typography>
          </Stack>
        )}

        {isReady && (
          <Stack
            alignItems="center"
            spacing={2}
            sx={{
              textAlign: 'center',
              mb: 4,
              p: 4,
              backgroundColor: brand.matchaGreen,
              color: '#fff',
            }}
          >
            <StorefrontOutlinedIcon sx={{ fontSize: 44 }} />
            <Typography variant="h3" sx={{ textWrap: 'balance' }}>
              {t.order.readyTitle}
            </Typography>
          </Stack>
        )}

        {isPaidState && !isReady && (
          <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', mb: 4 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 44, color: brand.matchaGreen }} />
            <Typography variant="h3" sx={{ textWrap: 'balance' }}>
              {data.status === 'confirmed' || data.status === 'preparing'
                ? t.order.confirmedTitle
                : t.order.status[data.status]}
            </Typography>
            {data.status === 'preparing' && (
              <Typography color="text.secondary">{t.order.status.preparing}</Typography>
            )}
          </Stack>
        )}

        {(data.status === 'failed' || data.status === 'cancelled') && (
          <Stack alignItems="center" spacing={2} sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3">{t.order.status[data.status]}</Typography>
          </Stack>
        )}
      </Box>

      {detailed && isPaidState && (
        <Stack spacing={1.5} divider={<Divider flexItem />} sx={{ mt: 2 }}>
          <Row label={t.order.orderNumber} value={data.orderNumber ?? '—'} />
          <Row label={t.order.nameLabel} value={data.customerName} />
          <Row label={t.order.amountPaid} value={formatEuros(data.totalCents)} />
          <Row
            label={t.order.pickupTime}
            value={data.estimatedPickupAt ? formatSlotLabel(data.estimatedPickupAt, CAFE_TZ) : '—'}
          />
          <Row label={t.location.label} value={t.location.address} />
        </Stack>
      )}

      {!detailed && isPaidState && (
        <Typography sx={{ textAlign: 'center' }} color="text.secondary">
          {t.order.status[data.status]}
        </Typography>
      )}
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography color="text.secondary" variant="body2" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </Typography>
      <Typography sx={{ textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}
