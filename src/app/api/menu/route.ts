import { NextResponse } from 'next/server';
import { getCatalog } from '@/server/square/catalogCache';

export const dynamic = 'force-dynamic';

/** Normalized Square catalog for the menu and ordering UIs. */
export async function GET() {
  try {
    const menu = await getCatalog();
    return NextResponse.json(menu, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=240' },
    });
  } catch (err) {
    console.error('menu fetch failed', err);
    const detail =
      process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : undefined;
    return NextResponse.json({ error: 'menu_unavailable', detail }, { status: 503 });
  }
}
