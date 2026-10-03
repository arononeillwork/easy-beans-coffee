'use client';

import { useParams } from 'next/navigation';
import { OrderStatusView } from '@/features/order/client/OrderStatusView';

/** Live order status, addressable only via the unguessable token. */
export default function OrderStatusPage() {
  const params = useParams<{ token: string }>();
  return <OrderStatusView token={params.token ?? null} />;
}
