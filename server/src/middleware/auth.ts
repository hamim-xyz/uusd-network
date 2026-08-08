import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'uusd-dev-secret-change-me-in-production';

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
