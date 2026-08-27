import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const WEAK_DEFAULTS = [
  'uusd-dev-secret-change-me-in-production',
  'change-me',
  'change-this-to-a-long-random-string',
  'secret',
  'jwt-secret',
];

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET || '';
  if (!secret || WEAK_DEFAULTS.some((w) => secret.toLowerCase().includes(w.toLowerCase()))) {
    throw new Error(
      'JWT_SECRET is required and must be a strong random string. Set JWT_SECRET before deploying.'
    );
  }
  return secret;
}

let JWT_SECRET: string;
try {
  JWT_SECRET = resolveJwtSecret();
} catch (e: any) {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_WEAK_SECRETS !== 'true') {
    console.error('[FATAL]', e.message);
    process.exit(1);
  }
  console.warn('[WARN] Using weak JWT secret for local dev only');
  JWT_SECRET = process.env.JWT_SECRET || 'uusd-local-dev-only-not-for-prod';
}

export interface AuthRequest extends Request {
  adminId?: number;
  adminUsername?: string;
}

export function signAdminToken(adminId: number, username: string): string {
  return jwt.sign({ adminId, username }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as any;
    req.adminId = payload.adminId;
    req.adminUsername = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
