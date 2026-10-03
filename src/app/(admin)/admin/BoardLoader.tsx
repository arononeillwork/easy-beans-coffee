'use client';

import dynamic from 'next/dynamic';

// The board is browser-only (drag & drop, localStorage view) and ships its own
// ThemeProvider, so it renders client-side without the site shell. `ssr: false`
// is only allowed in a client component, hence this file.
const AdminPage = dynamic(() => import('@/features/admin/client/AdminPage'), {
  ssr: false,
});

export default function BoardLoader() {
  return <AdminPage />;
}
