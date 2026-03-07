import { query } from '@/lib/db';

export async function getInventory(productId?: number) {
  const baseQuery = `
    SELECT i.*, p.product_code, p.product_type
    FROM inventory i
    JOIN products p ON p.id = i.product_id
  `;
  if (productId) {
    const res = await query(baseQuery + ' WHERE i.product_id = $1', [productId]);
    return res.rows;
  }
  const res = await query(baseQuery + ' ORDER BY p.product_code');
  return res.rows;
}

export async function addStock(productId: number, quantity: number, notes?: string) {
  const check = await query(`SELECT id, quantity FROM inventory WHERE product_id = $1`, [productId]);
  if (check.rowCount === 0) {
    const ins = await query(
      `INSERT INTO inventory (product_id, quantity, updated_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [productId, quantity]
    );
    return ins.rows[0];
  }
  const newQty = parseInt(check.rows[0].quantity) + quantity;
  const res = await query(
    `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE product_id = $2 RETURNING *`,
    [newQty, productId]
  );
  return res.rows[0];
}

export async function getLowStockProducts(threshold = 10) {
  const res = await query(
    `SELECT i.*, p.product_code, p.product_type, p.capacity
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     WHERE i.quantity < $1
     ORDER BY i.quantity ASC`,
    [threshold]
  );
  return res.rows;
}
