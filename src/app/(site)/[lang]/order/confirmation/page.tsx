'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useLanguage } from '@/i18n/LanguageProvider';
import { localePath } from '@/i18n/config';
import { OrderStatusView } from '@/features/order/client/OrderStatusView';

/**
 * Square redirects here after checkout. The redirect itself is never treated
 * as proof of payment — OrderStatusView polls the status endpoint, which
 * verifies against Square server-side until payment is confirmed.
 */
export default function ConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationInner />
    </Suspense>
  );
}

function ConfirmationInner() {
  const { t, lang } = useLanguage();
  const token = useSearchParams().get('token');

  return (
    <>
      <OrderStatusView token={token} detailed />
      {token && (
        <Box sx={{ textAlign: 'center', pb: 8 }}>
          <Button
            component={Link}
            href={localePath(lang, `/order/status/${token}`)}
            variant="outlined"
            size="small"
          >
            {t.order.statusLink}
          </Button>
        </Box>
      )}
    </>
  );
}
