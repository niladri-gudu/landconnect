import { performance } from 'node:perf_hooks';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { Server } from 'socket.io';
import { ZodError } from 'zod';

import { env } from './env';
import { gzipJson } from './lib/gzip';
import { prisma } from './lib/prisma';
import { AppError } from './lib/security';
import { authRouter } from './routes/auth';
import { callsRouter } from './routes/calls';
import { conversationsRouter } from './routes/conversations';
import { listingsRouter } from './routes/listings';
import { uploadsRouter } from './routes/uploads';

export function createApp(io: Server) {
  const app = express();

  app.set('io', io);

  // One line per request so Neon cold starts and slow queries are visible.
  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - startedAt);
      const line = `[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`;
      if (durationMs >= 500) console.warn(`${line} (slow)`);
      else console.log(line);
    });
    next();
  });

  app.use(helmet());
  app.use(gzipJson());
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'landconnect-api', uptimeSeconds: Math.round(process.uptime()) });
  });

  // Unlike /health, this actually reaches Postgres, so it exposes cold starts.
  app.get('/health/db', async (_req, res) => {
    const startedAt = performance.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        ok: true,
        db: 'up',
        latencyMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      console.error('[api] database health check failed', error);
      res.status(503).json({ ok: false, db: 'down' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/listings', listingsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/calls', callsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request', details: err.flatten() });
      return;
    }
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('[api] unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
