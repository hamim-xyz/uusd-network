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
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_WEAK_SECRETS !== 'true') {
      throw new Error(
        'JWT_SECRET is required and must be a strong random string. Set JWT_SECRET before deploying.'
      );
    }
    console.warn('[WARN] Using weak JWT secret for local dev only');
    return secret || 'uusd-local-dev-only-not-for-prod';
  }
  return secret;
}

let _jwtSecret: string | null = null;
function getJwtSecret(): string {
  if (!_jwtSecret) _jwtSecret = resolveJwtSecret();
  return _jwtSecret;
}

export interface AuthRequest extends Request {
  adminId?: number;
  adminUsername?: string;
}

export function signAdminToken(adminId: number, username: string): string {
  return jwt.sign({ adminId, username }, getJwtSecret(), { expiresIn: '7d' });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret()) as any;
    req.adminId = payload.adminId;
    req.adminUsername = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
