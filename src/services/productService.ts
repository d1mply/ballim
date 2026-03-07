import { query } from '@/lib/db';

export async function getProducts() {
  const res = await query(`
    SELECT p.*,
      COALESCE(i.quantity, 0) as inventory_quantity,
      COALESCE(
        (SELECT SUM(quantity) FROM order_items
         WHERE product_id = p.id AND status IN ('onay_bekliyor', 'uretiliyor', 'uretildi', 'hazirlaniyor')),
        0
      ) as reserved_quantity,
      (SELECT json_agg(json_build_object('id', pf.id, 'type', pf.filament_type, 'color', pf.filament_color, 'weight', pf.weight))
       FROM product_filaments pf WHERE pf.product_id = p.id) as filaments
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    ORDER BY p.product_code
  `);
  return res.rows;
}

export async function getProductById(id: number) {
  const res = await query(
    `SELECT p.*,
      COALESCE(i.quantity, 0) as inventory_quantity,
      (SELECT json_agg(json_build_object('id', pf.id, 'type', pf.filament_type, 'color', pf.filament_color, 'weight', pf.weight))
       FROM product_filaments pf WHERE pf.product_id = p.id) as filaments
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.id = $1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function getProductStock(productId: number) {
  const invRes = await query(`SELECT COALESCE(quantity, 0) as qty FROM inventory WHERE product_id = $1`, [productId]);
  const reservedRes = await query(
    `SELECT COALESCE(SUM(quantity), 0) as qty FROM order_items
     WHERE product_id = $1 AND status IN ('onay_bekliyor', 'uretiliyor', 'uretildi', 'hazirlaniyor')`,
    [productId]
  );
  const total = parseInt(invRes.rows[0]?.qty ?? '0');
  const reserved = parseInt(reservedRes.rows[0]?.qty ?? '0');
  return { total, reserved, available: Math.max(0, total - reserved) };
}
