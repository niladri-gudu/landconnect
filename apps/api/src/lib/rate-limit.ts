import rateLimit from 'express-rate-limit';

/**
 * Abuse protection for the demo deployment. Limits are per IP, generous enough
 * for a two-device demo and repeated QA, and return the same `{ error }` shape
 * as every other API failure.
 */
const common = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
};

/** Login/register/refresh: slow down credential stuffing and sign-up spam. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  ...common,
});

/** Conversation creation and message sends, but never reads. */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  skip: (req) => req.method === 'GET',
  ...common,
});

/** Call create/answer/end ring real devices; cap writes but never reads. */
export const callLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  skip: (req) => req.method === 'GET',
  ...common,
});
