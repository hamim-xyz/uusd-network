import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Creates tables if missing + seeds admin only when ADMIN_PASSWORD is set. */
export async function ensureSchema(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.warn('[DB] schema.sql not found — skip auto-init');
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err: any) {
      const msg = err?.message || '';
      if (
        msg.includes('already exists') ||
        msg.includes('Duplicate') ||
        err.code === 'ER_TABLE_EXISTS_ERROR' ||
        err.code === 'ER_DUP_ENTRY'
      ) {
        // ignore
      } else {
        console.warn('[DB] schema warn:', msg.slice(0, 120));
      }
    }
  }

  const migrations = [
    `ALTER TABLE wallets ADD COLUMN encrypted_private_key TEXT NULL`,
    `CREATE TABLE IF NOT EXISTS onchain_transactions (
      id VARCHAR(64) PRIMARY KEY,
      telegram_id VARCHAR(64) NOT NULL,
      direction ENUM('deposit','withdraw') NOT NULL,
      tx_hash VARCHAR(80) NULL,
      from_address VARCHAR(66) NULL,
      to_address VARCHAR(66) NULL,
      amount DECIMAL(36,18) NOT NULL DEFAULT 0,
      symbol VARCHAR(32) NOT NULL DEFAULT 'BNB',
      status ENUM('pending','confirmed','failed') DEFAULT 'confirmed',
      gas_fee DECIMAL(36,18) NULL,
      note TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_onchain_user (telegram_id),
      INDEX idx_onchain_time (created_at DESC),
      INDEX idx_onchain_tx (tx_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      const msg = err?.message || '';
      if (
        msg.includes('Duplicate column') ||
        msg.includes('already exists') ||
        err.code === 'ER_DUP_FIELDNAME' ||
        err.code === 'ER_TABLE_EXISTS_ERROR'
      ) {
        // already migrated
      } else {
        console.warn('[DB] migrate warn:', msg.slice(0, 120));
      }
    }
  }

  // Admin seed ONLY when ADMIN_PASSWORD is explicitly set — no hardcoded default
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && adminPassword.length >= 8) {
    try {
      const hash = await bcrypt.hash(adminPassword, 10);
      await query(
        `INSERT INTO admins (username, password_hash) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE username = username`,
        ['admin', hash]
      );
      console.log('[DB] Admin seeded/verified (username=admin)');
    } catch (e: any) {
      console.warn('[DB] admin seed:', e?.message?.slice(0, 100));
    }
  } else {
    console.warn(
      '[DB] No admin seeded — set ADMIN_PASSWORD (min 8 chars) and redeploy, or create admin manually.'
    );
  }

  console.log('[DB] Schema ready');
}
