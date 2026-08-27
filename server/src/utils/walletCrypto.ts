import crypto from 'crypto';
import { Wallet } from 'ethers';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const secret =
    process.env.WALLET_ENCRYPTION_KEY ||
    (process.env.JWT_SECRET && !process.env.JWT_SECRET.includes('change-me')
      ? process.env.JWT_SECRET
      : null) ||
    process.env.MYSQLPASSWORD ||
    process.env.MYSQL_PASSWORD ||
    process.env.DB_PASSWORD ||
    'uusd-default-encryption-key-change-in-prod';

  if (!process.env.WALLET_ENCRYPTION_KEY) {
    console.warn(
      '[WARN] WALLET_ENCRYPTION_KEY not set — using fallback. Set a dedicated key in Railway.'
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
