import crypto from 'crypto';
import { Wallet } from 'ethers';

const ALGO = 'aes-256-gcm';

const WEAK_DEFAULTS = [
  'uusd-default-encryption-key-change-in-prod',
  'change-me',
  'change-me-to-long-random-secret',
];

function getKey(): Buffer {
  const secret = process.env.WALLET_ENCRYPTION_KEY || '';
  if (!secret || WEAK_DEFAULTS.some((w) => secret.toLowerCase().includes(w.toLowerCase()))) {
    throw new Error(
      'WALLET_ENCRYPTION_KEY is required and must be a strong random string. Set it before deploying.'
    );
  }
  return crypto.createHash('sha256').update(String(secret)).digest();
}

export function encryptPrivateKey(privateKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptPrivateKey(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function generateBscWallet(): {
  address: string;
  privateKey: string;
  encryptedPrivateKey: string;
} {
  const w = Wallet.createRandom();
  const privateKey = w.privateKey;
  return {
    address: w.address,
    privateKey,
    encryptedPrivateKey: encryptPrivateKey(privateKey),
  };
}
