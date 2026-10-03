import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PinGate from '@/features/admin/client/PinGate';
import {
  BOARD_COOKIE,
  hasBoardAccess,
  isBoardPinConfigured,
  matchesBoardPin,
} from '@/server/admin/boardAuth';
import BoardLoader from './BoardLoader';

// The PIN cookie decides what renders, so this is checked on every request.
export const dynamic = 'force-dynamic';

async function signIn(formData: FormData): Promise<void> {
  'use server';
  const pin = formData.get('pin');
  if (typeof pin === 'string' && matchesBoardPin(pin.trim())) {
    (await cookies()).set(BOARD_COOKIE, pin.trim(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/admin',
      // A month, so staff on their phones aren't asked every shift.
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect('/admin');
  }
  // A wrong guess costs a second, which makes working through PINs slow.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  redirect('/admin?pin=wrong');
}

export default async function AdminRoute({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string }>;
}) {
  if (await hasBoardAccess()) return <BoardLoader />;

  const { pin } = await searchParams;
  return <PinGate action={signIn} wrong={pin === 'wrong'} locked={!isBoardPinConfigured()} />;
}
