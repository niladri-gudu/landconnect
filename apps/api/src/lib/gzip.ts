import { gzipSync } from 'node:zlib';

import type { RequestHandler, Response } from 'express';

const MIN_SIZE_BYTES = 1024;

/**
 * Dependency-free gzip for JSON responses. The API only returns JSON, so
 * wrapping res.json covers every route without a compression package.
 */
export function gzipJson(): RequestHandler {
  return (req, res, next) => {
    if (!/\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) {
      next();
      return;
    }

    const json = res.json.bind(res);

    res.json = ((body: unknown) => {
      const payload = JSON.stringify(body);
      if (payload === undefined) return json(body);

      const raw = Buffer.from(payload);
      // Small payloads are not worth the gzip header overhead.
      if (raw.length < MIN_SIZE_BYTES) return json(body);

      const compressed = gzipSync(raw);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Length', compressed.length);
      return res.end(compressed);
    }) as Response['json'];

    next();
  };
}
