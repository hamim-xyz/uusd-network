import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function createPool() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    return mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 20),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: '+00:00',
      charset: 'utf8mb4',
    } as any);
  }

  const host =
    process.env.MYSQLHOST ||
    process.env.MYSQL_HOST ||
    process.env.DB_HOST ||
    'localhost';
  const port = Number(
    process.env.MYSQLPORT ||
      process.env.MYSQL_PORT ||
      process.env.DB_PORT ||
      3306
  );
  const user =
    process.env.MYSQLUSER ||
    process.env.MYSQL_USER ||
    process.env.DB_USER ||
    'root';
  const password =
    process.env.MYSQLPASSWORD ||
    process.env.MYSQL_PASSWORD ||
    process.env.DB_PASSWORD ||
    '';
  const database =
    process.env.MYSQLDATABASE ||
    process.env.MYSQL_DATABASE ||
    process.env.DB_NAME ||
    'railway';

  console.log(`[DB] Connecting host=${host} port=${port} db=${database} user=${user}`);

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 20),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    timezone: '+00:00',
    charset: 'utf8mb4',
  });
}

export const pool = createPool();

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export async function getConnection() {
  return pool.getConnection();
}

export default pool;
