import type { PoolClient, QueryResult } from 'pg';
import { pool, validateQuery } from './db';

type QueryParams = (string | number | boolean | null)[];

export type TxQuery = (text: string, params?: QueryParams) => Promise<QueryResult>;

/**
 * Tek bir connection üzerinde gerçek transaction yürütür.
 *
 * NOT: `query()` fonksiyonu `pool.query()` kullandığı için ardışık çağrılar
 * farklı connection'lara düşebilir; bu yüzden BEGIN/COMMIT/ROLLBACK güvenli
 * çalışmaz. Bu helper tüm sorguları aynı client üzerinde çalıştırarak
 * atomikliği garanti eder.
 */
export async function withTransaction<T>(
  callback: (tx: TxQuery) => Promise<T>
): Promise<T> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query('BEGIN');

    const tx: TxQuery = async (text, params) => {
      const isReadOnly =
        text.trim().toUpperCase().startsWith('SELECT') ||
        text.trim().toUpperCase().startsWith('WITH');

      const validation = validateQuery(text, params, isReadOnly);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Query validation failed');
      }

      return client.query(text, params);
    };

    const result = await callback(tx);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
