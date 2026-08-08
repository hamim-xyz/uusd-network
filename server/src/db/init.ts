/**
 * Database initializer
 * Run: npm run db:init
 * Creates tables + default admin (admin / uusdadmin2026)
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
    await pool.query('SELECT 1');
    console.log('Connected.');
  } catch (err: any) {
    console.error('Cannot connect to MySQL:', err.message);
    console.error('Make sure MYSQLHOST / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE or MYSQL_URL is set.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
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
      if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
        console.warn('Statement warning:', err.message.slice(0, 120));
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
  console.log('Database initialized successfully.');
  await pool.end();
}

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
