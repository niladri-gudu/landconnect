import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import multer from 'multer';

import type { Files } from 'files-sdk';

import { env } from '../env';
import { AppError, requireAuth, requireRole } from '../lib/security';

export const uploadsRouter = Router();

const MAX_FILES = 4;
const MAX_BYTES = 8 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_TYPES[file.mimetype]) {
      cb(new AppError(415, 'Only JPEG, PNG, or WebP images are accepted'));
      return;
    }
    cb(null, true);
  },
});

let client: Files | null = null;

/**
 * Built on first use so a missing storage config fails the request, not boot.
 * `files-sdk` is ESM-only and this API compiles to CommonJS, so it is loaded
 * with a cached dynamic import rather than a static one.
 */
async function storage() {
  if (
    !env.storage.endpoint ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    throw new AppError(503, 'Object storage is not configured on this server');
  }
  if (!client) {
    const [{ Files }, { neon }] = await Promise.all([
      import('files-sdk'),
      import('files-sdk/neon'),
    ]);
    client = new Files({
      adapter: neon({ bucket: env.storage.bucket, endpoint: env.storage.endpoint }),
    });
  }
  return client;
}

/** The bucket is public_read, so the object URL is permanent (branch-scoped). */
function publicUrl(key: string) {
  const base = env.storage.endpoint.replace(/\/+$/, '');
  const path = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/${env.storage.bucket}/${path}`;
}

uploadsRouter.post(
  '/',
  requireAuth,
  requireRole('SELLER', 'BROKER'),
  (req, res, next) => {
    upload.array('files', MAX_FILES)(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof AppError) {
        next(error);
        return;
      }
      if (error instanceof multer.MulterError) {
        next(
          new AppError(
            error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
            error.code === 'LIMIT_FILE_SIZE'
              ? 'Each photo must be 8 MB or smaller'
              : error.message,
          ),
        );
        return;
      }
      next(error);
    });
  },
  async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw new AppError(400, 'Attach at least one photo');

    const store = await storage();
    const urls = await Promise.all(
      files.map(async (file) => {
        const extension = IMAGE_TYPES[file.mimetype] ?? 'jpg';
        const key = `listings/${req.user!.id}/${randomUUID()}.${extension}`;
        await store.upload(key, file.buffer, {
          contentType: file.mimetype,
          cacheControl: 'public, max-age=31536000, immutable',
        });
        return publicUrl(key);
      }),
    );

    res.status(201).json({ urls });
  },
);
