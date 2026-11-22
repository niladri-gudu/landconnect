import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthResponse, TokenPair } from '@landconnect/shared';

import { API_URL } from './config';

const STORAGE_KEY = 'landconnect.session';

let current: TokenPair | null = null;
let refreshPromise: Promise<TokenPair> | null = null;
const listeners = new Set<(session: TokenPair | null) => void>();

async function readRaw(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeRaw(value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value) globalThis.localStorage?.setItem(STORAGE_KEY, value);
      else globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable — session lives in memory only
    }
    return;
  }
  if (value) await SecureStore.setItemAsync(STORAGE_KEY, value);
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}

function notify() {
  for (const listener of listeners) listener(current);
}

export function subscribeSession(listener: (session: TokenPair | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSession(): TokenPair | null {
  return current;
}

export function getAccessToken(): string | null {
  return current?.accessToken ?? null;
}

export async function loadSession(): Promise<TokenPair | null> {
  if (current) return current;
  try {
    const raw = await readRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TokenPair>;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    current = {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    };
    return current;
  } catch {
    return null;
  }
}

export async function setSession(session: TokenPair): Promise<void> {
  current = session;
  await writeRaw(JSON.stringify(session));
  notify();
}

export async function clearSession(): Promise<void> {
  current = null;
  await writeRaw(null);
  notify();
}

/**
 * Rotates the refresh token and stores the new pair.
 * Concurrent 401s share one in-flight refresh so a token is never replayed.
 */
export function refreshSession(): Promise<TokenPair> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const existing = current ?? (await loadSession());
    if (!existing) throw new Error('No session');

    // A hung refresh blocks every queued request, so cap it like the API client.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: existing.refreshToken }),
        signal: controller.signal,
      });
    } catch {
      throw new Error(
        controller.signal.aborted
          ? 'Session refresh timed out. Check your connection.'
          : 'Cannot reach the API to refresh your session.',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      await clearSession();
      throw new Error('Session expired. Please sign in again.');
    }

    const data = (await response.json()) as AuthResponse;
    const next: TokenPair = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
    await setSession(next);
    return next;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
