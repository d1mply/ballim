import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Toplam ürün sayısı
    const productsResult = await query('SELECT COUNT(*) as count FROM products');
    const totalProducts = parseInt(productsResult.rows[0]?.count || '0');

    // Toplam sipariş sayısı
    const ordersResult = await query('SELECT COUNT(*) as count FROM orders');
    const totalOrders = parseInt(ordersResult.rows[0]?.count || '0');

    // Toplam müşteri sayısı
    const customersResult = await query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(customersResult.rows[0]?.count || '0');

    // Toplam gelir
    const revenueResult = await query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != \'İptal\'');
    const totalRevenue = parseFloat(revenueResult.rows[0]?.total || '0');

    // Bekleyen sipariş sayısı
    const pendingResult = await query('SELECT COUNT(*) as count FROM orders WHERE status = \'Beklemede\'');
    const pendingOrders = parseInt(pendingResult.rows[0]?.count || '0');

    // Kritik stok sayısı
    const criticalStockResult = await query(`
      SELECT COUNT(*) as count 
      FROM inventory i 
      JOIN products p ON i.product_id = p.id 
      WHERE i.quantity <= 5
    `);
    const criticalStock = parseInt(criticalStockResult.rows[0]?.count || '0');

    // Tamamlanan sipariş sayısı
    const completedResult = await query('SELECT COUNT(*) as count FROM orders WHERE status = \'Tamamlandı\'');
    const completedOrders = parseInt(completedResult.rows[0]?.count || '0');

    // Aktif müşteri sayısı (son 30 günde sipariş veren)
    const activeCustomersResult = await query(`
      SELECT COUNT(DISTINCT customer_id) as count 
      FROM orders 
      WHERE order_date >= CURRENT_DATE - INTERVAL '30 days' 
      AND customer_id IS NOT NULL
    `);
    const activeCustomers = parseInt(activeCustomersResult.rows[0]?.count || '0');

    const stats = {
      totalProducts,
      totalOrders,
      totalCustomers,
      totalRevenue,
      pendingOrders,
      criticalStock,
      completedOrders,
      activeCustomers
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Dashboard istatistikleri alınırken hata oluştu' },
      { status: 500 }
    );
  }
} 