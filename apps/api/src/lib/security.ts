import { createHash, randomBytes } from 'node:crypto';

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';

import type { Role } from '@landconnect/shared';

import { env } from '../env';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { ...user, typ: 'access' },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    },
  );
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.jwtSecret) as AuthUser & { typ?: string };
  if (decoded.typ !== 'access') {
    throw new Error('Not an access token');
  }
  return { id: decoded.id, email: decoded.email, name: decoded.name, role: decoded.role };
}

/**
 * Refresh tokens are opaque, high-entropy strings. Only their SHA-256 hash is
 * stored, so a database leak cannot be replayed against the API.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const requireAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Authentication required'));
    return;
  }
  try {
    req.user = verifyToken(header.slice('Bearer '.length));
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, 'Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'Insufficient permissions for this action'));
      return;
    }
    next();
  };
}
