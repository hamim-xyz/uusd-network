import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  MYSQLHOST,
  MYSQLPORT,
  MYSQLUSER,
  MYSQLPASSWORD,
  MYSQLDATABASE,
  MYSQL_URL,
  DATABASE_URL,
} = process.env;

function createPool() {
  if (MYSQL_URL || DATABASE_URL) {
    return mysql.createPool({
      uri: MYSQL_URL || DATABASE_URL,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 25),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: '+00:00',
      charset: 'utf8mb4',
    } as any);
  }

  return mysql.createPool({
    host: MYSQLHOST || process.env.DB_HOST || 'localhost',
    port: Number(MYSQLPORT || process.env.DB_PORT || 3306),
    user: MYSQLUSER || process.env.DB_USER || 'root',
    password: MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: MYSQLDATABASE || process.env.DB_NAME || 'uusd_network',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 25),
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
