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
  if (secret && !WEAK_DEFAULTS.some((w) => secret.toLowerCase().includes(w.toLowerCase()))) {
    return secret;
  }
  // Fallback chain for existing deploys that have not set JWT_SECRET yet
  const fromDb =
    process.env.MYSQLPASSWORD ||
    process.env.MYSQL_PASSWORD ||
    process.env.DB_PASSWORD ||
    '';
  if (fromDb) {
    console.warn('[WARN] JWT_SECRET not set — deriving from MySQL password (set JWT_SECRET soon)');
    return `uusd-jwt:${fromDb}`;
  }
  console.warn('[WARN] Using ephemeral JWT secret — set JWT_SECRET in Railway');
  return 'uusd-local-dev-only-not-for-prod';
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
