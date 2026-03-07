import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Yetkilendirme hatası' },
        { status: auth.status || 401 }
      );
    }

    const customerId = auth.user.role === 'customer'
      ? auth.user.customerId
      : null;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Müşteri bilgisi bulunamadı' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !['fatura', 'makbuz', 'ekstre'].includes(type)) {
      return NextResponse.json(
        { error: 'Geçersiz belge tipi. fatura, makbuz veya ekstre olmalıdır.' },
        { status: 400 }
      );
    }

    if (type === 'ekstre') {
      const result = await query(
        `SELECT id, tarih, aciklama, islem_turu, tutar, odeme_yontemi, bakiye
         FROM cari_hesap WHERE musteri_id = $1 ORDER BY tarih DESC`,
        [customerId]
      );
      return NextResponse.json({ type: 'ekstre', records: result.rows });
    }

    if (type === 'fatura') {
      const orderQuery = id
        ? `SELECT o.*, json_agg(json_build_object('code', p.product_code, 'name', p.product_type, 'qty', oi.quantity, 'price', oi.unit_price)) as items
           FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id
           WHERE o.customer_id = $1 AND o.id = $2 GROUP BY o.id`
        : `SELECT o.*, json_agg(json_build_object('code', p.product_code, 'name', p.product_type, 'qty', oi.quantity, 'price', oi.unit_price)) as items
           FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id
           WHERE o.customer_id = $1 GROUP BY o.id ORDER BY o.order_date DESC LIMIT 20`;

      const params = id ? [customerId, parseInt(id)] : [customerId];
      const result = await query(orderQuery, params);
      return NextResponse.json({ type: 'fatura', records: result.rows });
    }

    if (type === 'makbuz') {
      const paymentQuery = id
        ? `SELECT * FROM odemeler WHERE musteri_id = $1 AND id = $2`
        : `SELECT * FROM odemeler WHERE musteri_id = $1 ORDER BY odeme_tarihi DESC LIMIT 20`;

      const params = id ? [customerId, parseInt(id)] : [customerId];
      const result = await query(paymentQuery, params);
      return NextResponse.json({ type: 'makbuz', records: result.rows });
    }

    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  } catch (error) {
    console.error('Customer documents error:', error);
    return NextResponse.json(
      { error: 'Belgeler alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
