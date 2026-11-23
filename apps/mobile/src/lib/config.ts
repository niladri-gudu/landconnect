import Constants from 'expo-constants';

/**
 * In development the API runs on the same machine as Metro. Deriving the host
 * from the dev-server URL keeps the app working when the LAN IP changes, on
 * both the emulator (adb reverse → 127.0.0.1) and a physical phone (LAN IP).
 * Production builds have no hostUri and use the configured env URL.
 */
function bundlerHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  return host || null;
}

const fallback = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const host = bundlerHost();

export const API_URL = (host ? `http://${host}:4000` : fallback).replace(/\/$/, '');
