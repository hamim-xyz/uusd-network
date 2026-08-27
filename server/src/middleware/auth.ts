import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/** Prefer JWT_SECRET; else stable key from MySQL password so only 5 DB vars are required. */
function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET && !process.env.JWT_SECRET.includes('change-me')) {
    return process.env.JWT_SECRET;
  }
  const fromDb =
    process.env.MYSQLPASSWORD ||
    process.env.MYSQL_PASSWORD ||
    process.env.DB_PASSWORD ||
    '';
  if (fromDb) return `uusd-jwt:${fromDb}`;
  return 'uusd-dev-secret-change-me-in-production';
}

const JWT_SECRET = resolveJwtSecret();

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
