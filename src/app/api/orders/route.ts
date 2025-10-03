import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

// Siparişleri getir - Basitleştirilmiş ve müşteri izolasyonu ile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    let queryText = `
      SELECT 
        o.id,
        o.order_code,
        o.customer_id,
        o.status,
        o.total_amount,
        o.order_date,
        c.name as customer_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'code', oi.product_code,
              'name', oi.product_name,
              'quantity', oi.quantity,
              'status', oi.status
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) as products
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;
    
    const queryParams = [];
    
    // Müşteri izolasyonu
    if (customerId) {
      queryText += ` WHERE o.customer_id = $1`;
      queryParams.push(customerId);
    }
    
    queryText += ` GROUP BY o.id, o.order_code, o.customer_id, o.status, o.total_amount, o.order_date, c.name
                   ORDER BY o.created_at DESC LIMIT 50`;
    
    const result = await query(queryText, queryParams);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Siparişleri getirme hatası:', error);
    return NextResponse.json(
      { error: 'Siparişler getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni sipariş oluştur
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Orders API POST çağrıldı');
    const body = await request.json();
    console.log('📋 Gelen veri:', JSON.stringify(body, null, 2));
    
    const { customerId, customerName, products, orderType = 'normal' } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error('❌ Eksik parametreler:', { products });
      return NextResponse.json(
        { error: 'Ürünler gerekli' },
        { status: 400 }
      );
    }
    
    // customerId yoksa NULL kullan (stok üretimi için)
    const finalCustomerId = customerId || null;

    console.log('✅ Parametreler doğrulandı');

    // Sipariş kodu oluştur - Sequence kullanarak sıralı
    let orderCode: string;
    const prefix = orderType === 'stock_production' ? 'STK' : 'SIP';
    
    try {
      const sequenceName = orderType === 'stock_production' ? 'stock_order_number_seq' : 'order_number_seq';
      const seqResult = await query(`SELECT nextval('${sequenceName}') as order_number`);
      const orderNumber = seqResult.rows[0].order_number;
      orderCode = `${prefix}-${orderNumber}`;
      console.log('📝 Sipariş kodu oluşturuldu:', orderCode);
    } catch (seqError) {
      // Sequence yoksa fallback: timestamp kullan
      console.warn('⚠️ Sequence bulunamadı, timestamp kullanılıyor:', seqError);
      orderCode = `${prefix}-${String(Date.now()).slice(-6)}`;
    }

    // Transaction başlat
    await query('BEGIN');
    console.log('🔄 Transaction başlatıldı');

    try {
      // Siparişi oluştur
      console.log('📦 Sipariş oluşturuluyor...');
      const orderResult = await query(`
        INSERT INTO orders (order_code, customer_id, status, total_amount, order_date, payment_status, notes, created_at, updated_at)
        VALUES ($1, $2, 'Onay Bekliyor', 0, CURRENT_TIMESTAMP, 'Ödeme Bekliyor', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [orderCode, finalCustomerId, body.notes || '']);

      if (!orderResult.rows || orderResult.rows.length === 0) {
        throw new Error('Sipariş oluşturulamadı');
      }

      const order = orderResult.rows[0];
      console.log('✅ Sipariş oluşturuldu:', order.id);
      
      let totalAmount = 0;

      // Sipariş ürünlerini ekle
      console.log('🛍️ Sipariş ürünleri ekleniyor...');
      for (const product of products) {
        const { productId, quantity, unitPrice } = product;
        console.log(`📦 Ürün işleniyor: ${productId}, Miktar: ${quantity}, Fiyat: ${unitPrice}`);
        
        // Ürün bilgilerini al
        const productResult = await query(`
          SELECT product_code, product_type
          FROM products 
          WHERE id = $1
        `, [productId]);

        if (productResult.rows.length === 0) {
          throw new Error(`Ürün bulunamadı: ${productId}`);
        }

        const productInfo = productResult.rows[0];
        const finalUnitPrice = unitPrice || 0;
        const itemTotal = quantity * finalUnitPrice;
        totalAmount += itemTotal;

        console.log(`💰 Ürün fiyatı: ${finalUnitPrice}, Toplam: ${itemTotal}`);

        // Order item ekle
        await query(`
          INSERT INTO order_items (
            order_id, product_id, product_code, product_name, 
            quantity, unit_price, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'onay_bekliyor', CURRENT_TIMESTAMP)
        `, [
          order.id,
          productId,
          productInfo.product_code,
          productInfo.product_type,
          quantity,
          finalUnitPrice
        ]);
        
        console.log(`✅ Ürün eklendi: ${productInfo.product_code}`);
      }

      // Toplam tutarı güncelle
      console.log('💰 Toplam tutar güncelleniyor:', totalAmount);
      await query(`
        UPDATE orders 
        SET total_amount = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [totalAmount, order.id]);

      await query('COMMIT');
      console.log('✅ Transaction tamamlandı');

      return NextResponse.json({
        success: true,
        message: 'Sipariş başarıyla oluşturuldu',
        order: {
          ...order,
          totalAmount
        }
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      console.error('❌ Transaction hatası:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Sipariş oluşturma hatası:', error);
    return NextResponse.json(
      { 
        error: 'Sipariş oluşturulurken bir hata oluştu',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Sipariş sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Sipariş ID gerekli' },
        { status: 400 }
      );
    }

    // Sipariş ürünlerini sil
    await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    
    // Siparişi sil
    await query('DELETE FROM orders WHERE id = $1', [orderId]);

    return NextResponse.json({
      success: true,
      message: 'Sipariş başarıyla silindi'
    });

  } catch (error) {
    console.error('Sipariş silme hatası:', error);
    return NextResponse.json(
      { error: 'Sipariş silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}