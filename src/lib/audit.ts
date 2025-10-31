import { query } from './db';

let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS order_audit (
      id SERIAL PRIMARY KEY,
      order_id INTEGER,
      event TEXT NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS stock_audit (
      id SERIAL PRIMARY KEY,
      product_id INTEGER,
      operation TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      order_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS auth_audit (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      event TEXT NOT NULL,
      ip TEXT,
      ua TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  tablesEnsured = true;
}

export async function logOrderEvent(orderId: number | null, event: string, details?: Record<string, unknown>) {
  await ensureTables();
  await query(
    `INSERT INTO order_audit (order_id, event, details) VALUES ($1, $2, $3)`,
    [orderId, event, details ? JSON.stringify(details) : null]
  );
}

export async function logStockEvent(
  productId: number,
  operation: 'ADD' | 'REMOVE' | 'RESERVE' | 'UNRESERVE',
  quantity: number,
  orderId?: number
) {
  await ensureTables();
  await query(
    `INSERT INTO stock_audit (product_id, operation, quantity, order_id) VALUES ($1, $2, $3, $4)`,
    [productId, operation, quantity, orderId ?? null]
  );
}

export async function logAuthEvent(userId: string | null, event: string, ip?: string, ua?: string) {
  await ensureTables();
  await query(
    `INSERT INTO auth_audit (user_id, event, ip, ua) VALUES ($1, $2, $3, $4)`,
    [userId, event, ip ?? null, ua ?? null]
  );
}


