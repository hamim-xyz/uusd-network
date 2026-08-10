import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Creates tables if missing + seeds default admin. Safe on every boot. */
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

  try {
    const password = process.env.ADMIN_PASSWORD || 'uusdadmin2026';
    const hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO admins (username, password_hash) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE username = username`,
      ['admin', hash]
    );
  } catch (e: any) {
    console.warn('[DB] admin seed:', e?.message?.slice(0, 100));
  }

  console.log('[DB] Schema ready');
}
