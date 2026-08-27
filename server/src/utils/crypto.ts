import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/** PIN hash — bcrypt (slow KDF). salt param kept for API compat; bcrypt embeds salt. */
export async function hashPin(pin: string, _salt?: string): Promise<string> {
  return bcrypt.hash(String(pin), 10);
}

/** Verify PIN. Supports legacy SHA256(salt:pin) hashes and migrates on success. */
export async function verifyPin(
  pin: string,
  storedHash: string,
  salt?: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  // New bcrypt format
  if (storedHash.startsWith('$2')) {
    const valid = await bcrypt.compare(String(pin), storedHash);
    return { valid, needsRehash: false };
  }
  // Legacy SHA256(salt:pin)
  if (salt) {
    const legacy = crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
    if (legacy === storedHash) {
      return { valid: true, needsRehash: true };
    }
  }
  return { valid: false, needsRehash: false };
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

export function generateId(prefix = ''): string {
  return `${prefix}${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/** Round money amounts to 8 decimal places for consistency */
export function roundAmount(n: number, decimals = 8): number {
  const f = Math.pow(10, decimals);
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}
