import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function hashPin(pin: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

export function makeSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Generate a fake but realistic looking 0x address (custodial ledger) */
export function generateAddress(): string {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

export function generateId(prefix = ''): string {
  return `${prefix}${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
