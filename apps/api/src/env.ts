import 'dotenv/config';

const developmentSecret = 'dev-only-secret-change-me';
const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET ?? developmentSecret;
const corsOrigin = process.env.CORS_ORIGIN ?? '*';

// A known signing key in production would let anyone mint valid tokens.
if (isProduction && jwtSecret === developmentSecret) {
  throw new Error(
    '[api] Refusing to start: JWT_SECRET must be a strong, non-default value in production.',
  );
}
// Native clients do not send an Origin, so a wildcard is not exploitable for
// credential theft here, but it should still be locked down for any web client.
if (isProduction && corsOrigin === '*') {
  console.warn('[api] WARNING: CORS_ORIGIN is "*" in production. Set an explicit origin.');
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  isProduction,
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  corsOrigin,
  // Neon free databases sleep after ~5 minutes. A 4-minute ping keeps the
  // demo database awake; set to 0 to disable.
  dbKeepWarmMs: Number(process.env.DB_KEEPWARM_MS ?? 4 * 60 * 1000),
  livekit: {
    url: process.env.LIVEKIT_URL ?? '',
    apiKey: process.env.LIVEKIT_API_KEY ?? '',
    apiSecret: process.env.LIVEKIT_API_SECRET ?? '',
  },
  storage: {
    // Neon injects AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION too;
    // the Files SDK reads those from the environment.
    endpoint: process.env.AWS_ENDPOINT_URL_S3 ?? '',
    bucket: process.env.NEON_STORAGE_BUCKET ?? 'uploads',
  },
};

export const livekitEnabled = Boolean(
  env.livekit.url && env.livekit.apiKey && env.livekit.apiSecret,
);
