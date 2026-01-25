import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET() {
  try {
    // OPTIMIZED: Single query with multiple CTEs instead of 13 separate queries
    const result = await query(`
      WITH 
        product_stats AS (SELECT COUNT(*) as total_products FROM products),
        order_stats AS (
          SELECT 
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status = 'Beklemede') as pending_orders,
            COUNT(*) FILTER (WHERE status = 'Tamamlandı') as completed_orders,
            COALESCE(SUM(total_amount) FILTER (WHERE status != 'İptal'), 0) as total_revenue,
            COUNT(*) FILTER (WHERE DATE(order_date) = CURRENT_DATE) as today_orders,
            COALESCE(SUM(total_amount) FILTER (WHERE DATE(order_date) = CURRENT_DATE AND status != 'İptal'), 0) as today_revenue,
            COALESCE(SUM(total_amount) FILTER (
              WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND status != 'İptal'
            ), 0) as monthly_revenue,
            COUNT(DISTINCT customer_id) FILTER (
              WHERE order_date >= CURRENT_DATE - INTERVAL '30 days' 
              AND customer_id IS NOT NULL
            ) as active_customers
          FROM orders
        ),
        customer_stats AS (
          SELECT 
            COUNT(*) as total_customers,
            COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_new_customers
          FROM customers
        ),
        inventory_stats AS (
          SELECT COUNT(*) as critical_stock
          FROM inventory i 
          JOIN products p ON i.product_id = p.id 
          WHERE i.quantity <= 5
        )
      SELECT 
        ps.total_products::int,
        os.total_orders::int,
        os.pending_orders::int,
        os.completed_orders::int,
        os.total_revenue::float,
        os.today_orders::int,
        os.today_revenue::float,
        os.monthly_revenue::float,
        os.active_customers::int,
        cs.total_customers::int,
        cs.today_new_customers::int,
        inv.critical_stock::int
      FROM product_stats ps, order_stats os, customer_stats cs, inventory_stats inv
    `);

    const row = result.rows[0] || {};
    const stats = {
      totalProducts: row.total_products || 0,
      totalOrders: row.total_orders || 0,
      totalCustomers: row.total_customers || 0,
      totalRevenue: row.total_revenue || 0,
      pendingOrders: row.pending_orders || 0,
      criticalStock: row.critical_stock || 0,
      completedOrders: row.completed_orders || 0,
      activeCustomers: row.active_customers || 0,
      todayOrders: row.today_orders || 0,
      todayRevenue: row.today_revenue || 0,
      todayNewCustomers: row.today_new_customers || 0,
      monthlyRevenue: row.monthly_revenue || 0
    };

    // 🚀 PERFORMANS: Cache headers (5 dakika cache - stats az değişir)
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Dashboard istatistikleri alınırken hata oluştu' },
      { status: 500 }
    );
  }
} 