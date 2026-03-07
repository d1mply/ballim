import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const auth = verifyAuth(request);
  if (!auth.authenticated || auth.user?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin yetkisi gereklidir' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'sales') {
      return NextResponse.json(await getSalesReport());
    }
    if (type === 'inventory') {
      return NextResponse.json(await getInventoryReport());
    }
    if (type === 'accounting') {
      return NextResponse.json(await getAccountingReport());
    }

    return NextResponse.json(
      { error: 'Geçersiz rapor tipi. Desteklenen: sales, inventory, accounting' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Rapor hatası:', error);
    return NextResponse.json(
      { error: 'Rapor oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

async function getSalesReport() {
  const summaryResult = await query(`
    SELECT COUNT(*) as order_count,
           COALESCE(SUM(total_amount), 0) as total_revenue,
           COALESCE(AVG(total_amount), 0) as avg_order_value
    FROM orders WHERE status != 'İptal'
  `);

  const monthlyResult = await query(`
    SELECT DATE_TRUNC('month', created_at) as month,
           COUNT(*) as order_count,
           COALESCE(SUM(total_amount), 0) as revenue
    FROM orders
    WHERE status != 'İptal' AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY month ORDER BY month
  `);

  const topProductsResult = await query(`
    SELECT p.product_code, p.product_type,
           SUM(oi.quantity) as total_sold
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY p.id, p.product_code, p.product_type
    ORDER BY total_sold DESC LIMIT 10
  `);

  const topCustomersResult = await query(`
    SELECT c.name, c.customer_code,
           SUM(o.total_amount) as total_spent,
           COUNT(o.id) as order_count
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.status != 'İptal'
    GROUP BY c.id, c.name, c.customer_code
    ORDER BY total_spent DESC LIMIT 10
  `);

  return {
    summary: summaryResult.rows[0],
    monthlyRevenue: monthlyResult.rows,
    topProducts: topProductsResult.rows,
    topCustomers: topCustomersResult.rows,
  };
}

async function getInventoryReport() {
  const lowStockResult = await query(`
    SELECT p.product_code, p.product_type,
           COALESCE(i.quantity, 0) as stock
    FROM products p
    LEFT JOIN (
      SELECT product_id, SUM(quantity) as quantity
      FROM inventory GROUP BY product_id
    ) i ON p.id = i.product_id
    WHERE COALESCE(i.quantity, 0) < 10
    ORDER BY stock ASC
  `);

  const summaryResult = await query(`
    SELECT COUNT(*) as total_products,
           COALESCE(SUM(i.quantity), 0) as total_stock
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
  `);

  return {
    lowStock: lowStockResult.rows,
    summary: summaryResult.rows[0],
  };
}

async function getAccountingReport() {
  const balancesResult = await query(`
    SELECT c.name, c.customer_code,
           COALESCE(SUM(
             CASE WHEN ch.islem_turu = 'Borçlandırma' THEN ch.tutar
                  WHEN ch.islem_turu = 'Tahsilat' THEN -ch.tutar
                  ELSE 0 END
           ), 0) as balance
    FROM customers c
    LEFT JOIN cari_hesap ch ON c.id = ch.musteri_id
    GROUP BY c.id, c.name, c.customer_code
    HAVING COALESCE(SUM(
      CASE WHEN ch.islem_turu = 'Borçlandırma' THEN ch.tutar
           WHEN ch.islem_turu = 'Tahsilat' THEN -ch.tutar
           ELSE 0 END
    ), 0) != 0
    ORDER BY balance DESC
  `);

  const totalDebt = balancesResult.rows
    .filter((r: { balance: number }) => r.balance > 0)
    .reduce((sum: number, r: { balance: number }) => sum + Number(r.balance), 0);

  const totalCredit = balancesResult.rows
    .filter((r: { balance: number }) => r.balance < 0)
    .reduce((sum: number, r: { balance: number }) => sum + Math.abs(Number(r.balance)), 0);

  return {
    balances: balancesResult.rows,
    summary: { totalDebt, totalCredit, customerCount: balancesResult.rows.length },
  };
}
