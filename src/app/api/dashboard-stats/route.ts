import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET() {
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

    // Günlük istatistikler (Bugün)
    const todayOrdersResult = await query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE DATE(order_date) = CURRENT_DATE
    `);
    const todayOrders = parseInt(todayOrdersResult.rows[0]?.count || '0');

    const todayRevenueResult = await query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE DATE(order_date) = CURRENT_DATE 
      AND status != 'İptal'
    `);
    const todayRevenue = parseFloat(todayRevenueResult.rows[0]?.total || '0');

    const todayNewCustomersResult = await query(`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayNewCustomers = parseInt(todayNewCustomersResult.rows[0]?.count || '0');

    // Aylık gelir (Bu ay)
    const monthlyRevenueResult = await query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND status != 'İptal'
    `);
    const monthlyRevenue = parseFloat(monthlyRevenueResult.rows[0]?.total || '0');

    const stats = {
      totalProducts,
      totalOrders,
      totalCustomers,
      totalRevenue,
      pendingOrders,
      criticalStock,
      completedOrders,
      activeCustomers,
      todayOrders,
      todayRevenue,
      todayNewCustomers,
      monthlyRevenue
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