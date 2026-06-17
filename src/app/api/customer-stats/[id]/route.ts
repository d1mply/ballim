import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthUser, canAccessCustomerData } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Geçersiz müşteri ID' },
        { status: 400 }
      );
    }

    // IDOR koruması: giriş zorunlu + müşteri yalnızca kendi verisine erişebilir
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Kimlik doğrulaması gerekli' },
        { status: 401 }
      );
    }
    if (!canAccessCustomerData(authUser, customerId)) {
      return NextResponse.json(
        { error: 'Bu veriye erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    // Toplam sipariş sayısı
    const totalOrdersResult = await query(
      'SELECT COUNT(*) as count FROM orders WHERE customer_id = $1',
      [customerId]
    );
    const totalOrders = parseInt(totalOrdersResult.rows[0]?.count || '0');

    // Toplam harcama
    const totalSpentResult = await query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE customer_id = $1 AND status != \'İptal\'',
      [customerId]
    );
    const totalSpent = parseFloat(totalSpentResult.rows[0]?.total || '0');

    // Bekleyen sipariş sayısı
    const pendingOrdersResult = await query(
      'SELECT COUNT(*) as count FROM orders WHERE customer_id = $1 AND status = \'Beklemede\'',
      [customerId]
    );
    const pendingOrders = parseInt(pendingOrdersResult.rows[0]?.count || '0');

    // Tamamlanan sipariş sayısı
    const completedOrdersResult = await query(
      'SELECT COUNT(*) as count FROM orders WHERE customer_id = $1 AND status = \'Tamamlandı\'',
      [customerId]
    );
    const completedOrders = parseInt(completedOrdersResult.rows[0]?.count || '0');

    // Mevcut bakiye (cari hesap)
    const balanceResult = await query(
      'SELECT COALESCE(SUM(CASE WHEN islem_turu = \'Borçlandırma\' THEN tutar WHEN islem_turu = \'Tahsilat\' THEN -tutar ELSE 0 END), 0) as balance FROM cari_hesap WHERE musteri_id = $1',
      [customerId]
    );
    const currentBalance = parseFloat(balanceResult.rows[0]?.balance || '0');

    // Favori ürün sayısı (en çok sipariş verilen)
    const favoriteProductsResult = await query(
      `SELECT COUNT(DISTINCT oi.product_id) as count 
       FROM order_items oi 
       JOIN orders o ON oi.order_id = o.id 
       WHERE o.customer_id = $1`,
      [customerId]
    );
    const favoriteProducts = parseInt(favoriteProductsResult.rows[0]?.count || '0');

    // Son 6 ayın aylık harcaması (grafik için)
    const monthlyResult = await query(
      `SELECT to_char(date_trunc('month', order_date), 'YYYY-MM') as month,
              COALESCE(SUM(total_amount), 0) as amount
       FROM orders
       WHERE customer_id = $1
         AND status != 'İptal'
         AND order_date >= (CURRENT_DATE - INTERVAL '6 months')
       GROUP BY 1
       ORDER BY 1`,
      [customerId]
    );
    const monthlySpending = monthlyResult.rows.map((r) => ({
      month: r.month,
      amount: parseFloat(r.amount) || 0,
    }));

    const stats = {
      totalOrders,
      totalSpent,
      pendingOrders,
      completedOrders,
      currentBalance,
      favoriteProducts,
      monthlySpending
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Customer stats error:', error);
    return NextResponse.json(
      { error: 'Müşteri istatistikleri alınırken hata oluştu' },
      { status: 500 }
    );
  }
} 