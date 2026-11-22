import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  // Neon free databases sleep after ~5 minutes. A 4-minute ping keeps the
  // demo database awake; set to 0 to disable.
  dbKeepWarmMs: Number(process.env.DB_KEEPWARM_MS ?? 4 * 60 * 1000),
  livekit: {
    url: process.env.LIVEKIT_URL ?? '',
    apiKey: process.env.LIVEKIT_API_KEY ?? '',
    apiSecret: process.env.LIVEKIT_API_SECRET ?? '',
  },
};

export const livekitEnabled = Boolean(
  env.livekit.url && env.livekit.apiKey && env.livekit.apiSecret,
);
