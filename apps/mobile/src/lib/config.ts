export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'
).replace(/\/$/, '');

if (
  process.env.NODE_ENV !== 'production' &&
  /localhost|127\.0\.0\.1/.test(API_URL)
) {
  console.warn(
    `[api] EXPO_PUBLIC_API_URL is ${API_URL}. A physical phone cannot reach localhost — use your computer's LAN IP (e.g. http://192.168.1.20:4000).`,
  );
}
