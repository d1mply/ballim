import { QueryResult } from 'pg';
import { pool } from './pool';
import { validateQuery } from './validation';
import { logSecurityEvent } from '../security';

export type QueryParams = (string | number | boolean | null)[];

/**
 * Execute a SQL query with automatic validation and logging
 * 
 * @param text - SQL query text with $1, $2, etc. placeholders
 * @param params - Query parameters
 * @returns Query result
 */
export async function query(
  text: string,
  params?: QueryParams
): Promise<QueryResult> {
  const start = Date.now();

  try {
    // Determine if query is read-only for validation optimization
    const isReadOnly =
      text.trim().toUpperCase().startsWith('SELECT') ||
      text.trim().toUpperCase().startsWith('WITH');

    // Security: Query validation
    const validation = validateQuery(text, params, isReadOnly);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Query validation failed');
    }

    // Development logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sorgu başlatılıyor:', { text, params });
      console.log('Veritabanı bilgileri:', {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        hasDatabase_URL: !!process.env.DATABASE_URL,
      });
    }

    // Execute query with prepared statement (pg automatically uses prepared statements)
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== 'production') {
      console.log('Sorgu çalıştırıldı', { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error('Sorgu hatası:', {
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      query: text.substring(0, 200),
      params: params
        ? params.map((p) => (typeof p === 'string' ? p.substring(0, 50) : p))
        : undefined,
      timestamp: new Date().toISOString(),
    });

    // Log security errors separately
    if (error instanceof Error && error.message.includes('validation')) {
      logSecurityEvent(
        'QUERY_VALIDATION_FAILED',
        {
          query: text.substring(0, 200),
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        'CRITICAL'
      );
    }

    throw error;
  }
}
