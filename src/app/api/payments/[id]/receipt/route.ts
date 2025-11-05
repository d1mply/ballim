import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const paymentId = resolvedParams.id;

    // Ödeme detaylarını getir
    const paymentResult = await query(`
      SELECT 
        o.id,
        o.musteri_id,
        o.siparis_id,
        o.odeme_tarihi,
        o.tutar,
        o.odeme_yontemi,
        o.durum,
        o.aciklama,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        c.email as customer_email
      FROM odemeler o
      LEFT JOIN customers c ON c.id = o.musteri_id
      WHERE o.id = $1
    `, [paymentId]);

    if (paymentResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Ödeme bulunamadı' },
        { status: 404 }
      );
    }

    const payment = paymentResult.rows[0];

    // Sipariş bilgilerini getir (varsa)
    let orderInfo = null;
    if (payment.siparis_id) {
      const orderResult = await query(`
        SELECT 
          order_code,
          order_date,
          total_amount
        FROM orders
        WHERE id = $1
      `, [payment.siparis_id]);

      if (orderResult.rowCount > 0) {
        orderInfo = {
          order_code: orderResult.rows[0].order_code,
          order_date: new Date(orderResult.rows[0].order_date).toLocaleDateString('tr-TR'),
          total_amount: parseFloat(orderResult.rows[0].total_amount)
        };
      }
    }

    // Ödeme makbuzu verilerini hazırla
    const receiptData = {
      payment: {
        id: payment.id,
        odeme_tarihi: payment.odeme_tarihi,
        tutar: parseFloat(payment.tutar),
        odeme_yontemi: payment.odeme_yontemi,
        aciklama: payment.aciklama || null,
        durum: payment.durum
      },
      order: orderInfo,
      customer: {
        name: payment.customer_name || 'Müşteri Bulunamadı',
        phone: payment.customer_phone || null,
        address: payment.customer_address || null,
        email: payment.customer_email || null
      },
      companyInfo: {
        name: 'ULUDAĞ 3D',
        address: 'Bursa/Türkiye',
        phone: '+90 XXX XXX XX XX',
        email: 'info@uludag3d.com',
        website: 'www.uludag3d.com'
      }
    };

    return NextResponse.json(receiptData);
  } catch (error) {
    console.error('Ödeme makbuzu verileri alınırken hata:', error);
    return NextResponse.json(
      { error: 'Ödeme makbuzu verileri alınamadı' },
      { status: 500 }
    );
  }
}

