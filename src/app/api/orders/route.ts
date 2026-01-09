import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { parseIntSafe } from '@/lib/validation';
import { logOrderEvent } from '@/lib/audit';
import { createAuditLog, getUserFromRequest } from '../../../lib/audit-log';

// Siparişleri getir - Basitleştirilmiş ve müşteri izolasyonu ile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Toplam kayıt sayısı
    const countParams: any[] = [];
    let countQuery = `SELECT COUNT(DISTINCT o.id) AS cnt FROM orders o`;
    if (customerId) {
      countQuery += ` WHERE o.customer_id = $1`;
      countParams.push(customerId);
    }
    const countRes = await query(countQuery, countParams);
    const totalCount = parseInt(countRes.rows[0]?.cnt || '0', 10);

    // Liste sorgusu (N+1 azaltılmış, ürünler json_agg ile)
    const listParams: any[] = [];
    let listQuery = `
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
              'status', COALESCE(oi.status, 'onay_bekliyor')
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) as products
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;
    if (customerId) {
      listQuery += ` WHERE o.customer_id = $1`;
      listParams.push(customerId);
    }
    listParams.push(limit);
    listParams.push(offset);
    listQuery += ` GROUP BY o.id, o.order_code, o.customer_id, o.status, o.total_amount, o.order_date, c.name
                   ORDER BY o.created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`;

    const result = await query(listQuery, listParams);

    // 🚀 PERFORMANS: Cache headers (10 saniye cache - orders canlı data)
    return NextResponse.json({
      data: result.rows,
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit))
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        'CDN-Cache-Control': 'public, s-maxage=10',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=10',
      },
    });
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

      // Sipariş ürünlerini ekle (paket ve normal ürün desteği)
      console.log('🛍️ Sipariş ürünleri ekleniyor...');
      for (const product of products) {
        const { productId, packageId, quantity, unitPrice, isPackage } = product;
        console.log(`📦 Ürün işleniyor: ${isPackage ? 'PAKET' : 'ÜRÜN'}, ID: ${packageId || productId}, Miktar: ${quantity}, Fiyat: ${unitPrice}`);
        
        const finalUnitPrice = unitPrice || 0;
        const itemTotal = quantity * finalUnitPrice;
        totalAmount += itemTotal;

        // Paket ise
        if (isPackage && packageId) {
          // Paket bilgilerini al
          const packageResult = await query(`
            SELECT package_code, name
            FROM product_packages 
            WHERE id = $1
          `, [packageId]);

          if (packageResult.rows.length === 0) {
            throw new Error(`Paket bulunamadı: ${packageId}`);
          }

          const packageInfo = packageResult.rows[0];
          
          // Order item ekle (paket)
          await query(`
            INSERT INTO order_items (
              order_id, product_id, package_id, product_code, product_name, 
              quantity, unit_price, status, created_at
            ) VALUES ($1, NULL, $2, $3, $4, $5, $6, 'onay_bekliyor', CURRENT_TIMESTAMP)
          `, [
            order.id,
            packageId,
            packageInfo.package_code,
            packageInfo.name,
            quantity,
            finalUnitPrice
          ]);
          
          console.log(`✅ Paket eklendi: ${packageInfo.package_code}`);
        } else {
          // Normal ürün ise
        const productResult = await query(`
          SELECT product_code, product_type
          FROM products 
          WHERE id = $1
        `, [productId]);

        if (productResult.rows.length === 0) {
          throw new Error(`Ürün bulunamadı: ${productId}`);
        }

        const productInfo = productResult.rows[0];

          // Order item ekle (normal ürün)
        await query(`
          INSERT INTO order_items (
              order_id, product_id, package_id, product_code, product_name, 
            quantity, unit_price, status, created_at
            ) VALUES ($1, $2, NULL, $3, $4, $5, $6, 'onay_bekliyor', CURRENT_TIMESTAMP)
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

      // Audit log
      const userInfo = await getUserFromRequest(request);
      await createAuditLog({
        ...userInfo,
        action: 'CREATE',
        entityType: 'ORDER',
        entityId: String(order.id),
        entityName: orderCode,
        details: { 
          orderId: order.id, 
          orderCode, 
          orderType, 
          totalAmount, 
          itemCount: products.length 
        }
      });

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
    const orderIdStr = searchParams.get('id');
    const orderId = parseIntSafe(orderIdStr, 'Sipariş ID');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Sipariş ID gerekli' },
        { status: 400 }
      );
    }

    // Siparişi ve ürünlerini getir
    const orderResult = await query(
      `SELECT id, status FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }

    const itemsResult = await query(
      `SELECT product_id, quantity, status FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    // Üretim aşamasındaki siparişlerin silinmesini engelle (Senaryo3)
    const blockedStatuses = new Set(['uretiliyor', 'uretildi', 'hazirlaniyor']);
    if (itemsResult.rows.some((r: any) => blockedStatuses.has((r.status || '').toLowerCase()))) {
      return NextResponse.json(
        { error: 'Bu sipariş üretim sürecinde olduğu için silinemez. Lütfen önce süreci tamamlayın veya iptal edin.' },
        { status: 400 }
      );
    }

    // Transaction
    await query('BEGIN');

    // Senaryo1 ve Senaryo2: Rezerveyi sıfırla, hazırlandı olanların stoklarını geri ekle
    // Not: Filament asla geri alınmaz
    for (const item of itemsResult.rows) {
      const status = (item.status || '').toLowerCase();
      if (status === 'hazirlandi') {
        await query(
          `INSERT INTO inventory (product_id, quantity, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (product_id) DO UPDATE SET
             quantity = inventory.quantity + EXCLUDED.quantity,
             updated_at = CURRENT_TIMESTAMP`,
          [item.product_id, item.quantity]
        );
      }
    }

    // order_items sil (Senaryo2: rezerve otomatik 0'a düşer)
    await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    
    // Siparişi sil
    await query('DELETE FROM orders WHERE id = $1', [orderId]);

    await query('COMMIT');
    await logOrderEvent(orderId, 'ORDER_DELETED', {
      restoredStockForReadyItems: itemsResult.rows.filter((r: any) => (r.status || '').toLowerCase() === 'hazirlandi').length
    });

    return NextResponse.json({
      success: true,
      message: 'Sipariş silindi. Rezerve sıfırlandı, hazır olan ürünler stoğa iade edildi. Filament geri alınmadı.'
    });

  } catch (error) {
    await query('ROLLBACK').catch(() => undefined);
    console.error('Sipariş silme hatası:', error);
    return NextResponse.json(
      { error: 'Sipariş silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}