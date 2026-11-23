import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';

import { Server } from 'socket.io';

import { createApp } from './app';
import { env } from './env';
import { prisma } from './lib/prisma';
import { attachRealtime } from './realtime';

// Express must be passed to createServer before Socket.IO attaches. engine.io
// wraps the server's existing request listeners at attach time; adding
// Express afterwards races the socket handler and answers 404 for
// /socket.io/ handshakes, so no realtime event ever reaches a client.
const io = new Server({
  cors: {
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
  },
});

attachRealtime(io);

const app = createApp(io);
const httpServer = createServer(app);
io.attach(httpServer);

/** Wake Neon (and Prisma's pool) before the first user request does. */
async function warmDatabase() {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`[api] database warm in ${Math.round(performance.now() - startedAt)}ms`);
  } catch (error) {
    console.error('[api] database warm-up failed', error);
  }
}

let keepWarmTimer: NodeJS.Timeout | null = null;

/**
 * Neon's free tier suspends after ~5 minutes idle. Pinging below that keeps
 * the demo responsive. The timer is unref'd so it never blocks shutdown.
 */
function startKeepWarm() {
  if (!Number.isFinite(env.dbKeepWarmMs) || env.dbKeepWarmMs <= 0) {
    console.log('[api] database keep-warm disabled');
    return;
  }
  keepWarmTimer = setInterval(() => {
    void prisma.$queryRaw`SELECT 1`.catch((error: unknown) => {
      console.warn(
        '[api] keep-warm ping failed',
        error instanceof Error ? error.message : error,
      );
    });
  }, env.dbKeepWarmMs);
  keepWarmTimer.unref();
  console.log(`[api] database keep-warm every ${Math.round(env.dbKeepWarmMs / 1000)}s`);
}

function warnAboutDatabaseConfig() {
  if (!env.databaseUrl) return;
  const isPooled = env.databaseUrl.includes('-pooler');
  if (isPooled && !env.databaseUrl.includes('pgbouncer=true')) {
    console.warn(
      '[api] WARNING: pooled DATABASE_URL has no pgbouncer=true. Add it to avoid prepared-statement errors.',
    );
  }
  if (!env.databaseUrl.includes('connection_limit')) {
    console.warn(
      '[api] WARNING: DATABASE_URL has no connection_limit. Add connection_limit=5 for Neon.',
    );
  }
}

httpServer.listen(env.port, () => {
  console.log(`[api] LandConnect API listening on http://localhost:${env.port}`);
  console.log(`[api] Realtime socket ready at ws://localhost:${env.port}`);
  if (env.jwtSecret === 'dev-only-secret-change-me') {
    console.warn('[api] WARNING: using the development JWT secret. Set JWT_SECRET.');
  }
  if (!env.databaseUrl) {
    console.warn('[api] WARNING: DATABASE_URL is not set. Prisma queries will fail.');
  }
  warnAboutDatabaseConfig();
  void warmDatabase();
  startKeepWarm();
});

async function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down`);
  if (keepWarmTimer) clearInterval(keepWarmTimer);
  try {
    await prisma.$disconnect();
  } finally {
    io.close();
    httpServer.close(() => process.exit(0));
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
