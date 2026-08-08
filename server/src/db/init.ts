/**
 * Database initializer
 * Run once after Backend is connected to MySQL:
 *   npm run db:init
 *
 * Creates all tables + default admin (admin / uusdadmin2026)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function init() {
  console.log('Connecting to MySQL...');
  try {
    const [rows]: any = await pool.query('SELECT DATABASE() AS db');
    console.log('Connected. Database:', rows?.[0]?.db || '(unknown)');
  } catch (err: any) {
    console.error('Cannot connect to MySQL:', err.message);
    console.error(
      'Set MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE (or MYSQL_URL).'
    );
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql not found at', schemaPath);
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`Running ${statements.length} schema statements...`);

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.includes('already exists') ||
        msg.includes('Duplicate') ||
        err.code === 'ER_TABLE_EXISTS_ERROR' ||
        err.code === 'ER_DUP_ENTRY'
      ) {
        // ok
      } else {
        console.warn('Statement warning:', msg.slice(0, 160));
      }
    }
  }

  const password = 'uusdadmin2026';
  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO admins (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    ['admin', hash]
  );

  console.log('Default admin ready: username=admin  password=uusdadmin2026');
  console.log('CHANGE THIS PASSWORD before production.');
  console.log('Database initialized successfully.');
  await pool.end();
}

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
