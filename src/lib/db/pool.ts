import { Pool } from 'pg';

/**
 * PostgreSQL Connection Pool Configuration
 * 
 * Supports both DATABASE_URL (for cloud deployments) and 
 * individual environment variables (for local development)
 */
export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl:
          process.env.NODE_ENV === 'development'
            ? false
            : {
                rejectUnauthorized: false,
              },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
);

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT NOW()');
    console.log('Veritabanı bağlantısı başarılı');
    return true;
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    return false;
  }
}
