'use client';

import type { AccountProfile, AccountUpdate } from '../types';

/**
 * Thin typed client for the account endpoints. Sign-in itself never passes
 * through here — that is Supabase Auth's job (see supabaseAuthClient.ts);
 * these endpoints only serve the Square-held profile to whoever the session
 * cookie proves the caller to be.
 */
export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string };

async function call<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, {
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? 'request_failed' };
    return { ok: true, ...body };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export interface AccountPayload {
  profile: AccountProfile;
}

export const accountApi = {
  fetchProfile: () => call<AccountPayload>('/api/account'),

  saveProfile: (update: AccountUpdate) =>
    call<AccountPayload>('/api/account', {
      method: 'PUT',
      body: JSON.stringify(update),
    }),

  deleteAccount: () => call<object>('/api/account', { method: 'DELETE' }),
};
