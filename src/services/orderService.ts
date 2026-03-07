import { query } from '@/lib/db';

export async function getOrders(customerId?: number) {
  const baseQuery = `
    SELECT o.id, o.order_code, o.customer_id, o.order_date, o.total_amount,
           o.status, o.payment_status, o.notes, c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
  `;
  if (customerId) {
    const res = await query(baseQuery + ' WHERE o.customer_id = $1 ORDER BY o.order_date DESC, o.id DESC', [customerId]);
    return res.rows;
  }
  const res = await query(baseQuery + ' ORDER BY o.order_date DESC, o.id DESC');
  return res.rows;
}

export async function getOrderById(orderId: number) {
  const orderRes = await query(
    `SELECT o.*, c.name as customer_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1`,
    [orderId]
  );
  if (orderRes.rowCount === 0) return null;
  const order = orderRes.rows[0];
  const itemsRes = await query(
    `SELECT oi.*, p.product_code, p.product_type as product_name
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  return { ...order, items: itemsRes.rows };
}

export async function createOrder(
  customerId: number,
  items: Array<{ productId: number; quantity: number; unitPrice?: number }>,
  notes?: string
) {
  let totalAmount = 0;
  const seqRes = await query(`SELECT nextval('order_number_seq') as n`);
  const orderCode = 'SIP-' + seqRes.rows[0].n;
  const today = new Date().toISOString().split('T')[0];
  const orderRes = await query(
    `INSERT INTO orders (order_code, customer_id, order_date, total_amount, status, payment_status, notes)
     VALUES ($1, $2, $3, 0, 'onay_bekliyor', 'Beklemede', $4)
     RETURNING *`,
    [orderCode, customerId, today, notes ?? null]
  );
  const order = orderRes.rows[0];
  for (const item of items) {
    let unitPrice = item.unitPrice;
    if (unitPrice == null) {
      const priceRes = await query(`SELECT piece_gram FROM products WHERE id = $1`, [item.productId]);
      unitPrice = (priceRes.rows[0]?.piece_gram ?? 0) * 25;
    }
    totalAmount += unitPrice * item.quantity;
    const prodRes = await query(`SELECT product_code, product_type FROM products WHERE id = $1`, [item.productId]);
    const prod = prodRes.rows[0];
    await query(
      `INSERT INTO order_items (order_id, product_id, product_code, product_name, quantity, unit_price, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'onay_bekliyor')`,
      [order.id, item.productId, prod?.product_code ?? '', prod?.product_type ?? '', item.quantity, unitPrice]
    );
  }
  await query(`UPDATE orders SET total_amount = $1 WHERE id = $2`, [totalAmount, order.id]);
  return getOrderById(order.id);
}

export async function updateOrderStatus(orderId: number, status: string) {
  await query(`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, orderId]);
  return getOrderById(orderId);
}

export async function getOrderItems(orderId: number) {
  const res = await query(
    `SELECT oi.*, p.product_code, p.product_type as product_name
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  return res.rows;
}
