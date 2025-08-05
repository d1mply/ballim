import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { handleOrderStock, manageStock, StockOperation } from '../../../lib/stock';

// Production quantity ve skip_production sütunlarını kontrol et ve yoksa ekle
const checkAndAddOrderColumns = async () => {
  try {
    // production_quantity sütununu kontrol et
    const checkProductionQuantityColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'production_quantity'
    `);

    if (checkProductionQuantityColumn.rowCount === 0) {
      await query(`
        ALTER TABLE orders 
        ADD COLUMN production_quantity INTEGER DEFAULT 0
      `);
      console.log('production_quantity sütunu eklendi');
    }

    // skip_production sütununu kontrol et
    const checkSkipProductionColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'skip_production'
    `);

    if (checkSkipProductionColumn.rowCount === 0) {
      await query(`
        ALTER TABLE orders 
        ADD COLUMN skip_production BOOLEAN DEFAULT false
      `);
      console.log('skip_production sütunu eklendi');
    }
  } catch (error) {
    console.error('Orders tablo sütunları kontrol/ekleme hatası:', error);
    // Hata olsa bile devam et
  }
};

// Tüm siparişleri getir
export async function GET(request: NextRequest) {
  try {
    // Önce gerekli sütunları kontrol et ve ekle
    await checkAndAddOrderColumns();
    
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const orderType = url.searchParams.get('type'); // pazaryeri veya normal
    const limit = url.searchParams.get('limit'); // limit parametresi

    // Temel sorgu ve parametreler
    const params = [];
    
    // Önce skip_production sütununun varlığını kontrol et
    let hasSkipProductionColumn = true;
    try {
      const columnCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'skip_production'
      `);
      hasSkipProductionColumn = columnCheck.rowCount > 0;
    } catch (columnError) {
      console.error('Sütun kontrolü hatası:', columnError);
      hasSkipProductionColumn = false;
    }

    console.log('skip_production sütunu mevcut mu?', hasSkipProductionColumn);

    let baseQuery = `
      SELECT 
        o.id,
        o.order_code,
        COALESCE(c.name, 'Pazaryeri Müşterisi') as customer_name,
        o.order_date,
        o.total_amount,
        o.status,
        o.notes,
        COALESCE(o.production_quantity, 0) as production_quantity,
        ${hasSkipProductionColumn ? 'COALESCE(o.skip_production, false) as skip_production,' : 'false as skip_production,'}
        json_agg(
          json_build_object(
            'code', COALESCE(oi.product_code, p.product_code, 'SİLİNMİŞ'),
            'name', COALESCE(oi.product_name, p.product_type, 'Silinmiş Ürün'),
            'quantity', oi.quantity,
            'capacity', COALESCE(p.capacity, 0),
            'stock_quantity', COALESCE(i.quantity, 0),
            'unit_price', oi.unit_price
          )
        ) as products
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN inventory i ON i.product_id = p.id
    `;

    const whereConditions = [];

    // Müşteri ID'si varsa WHERE koşulu ekle
    if (customerId) {
      whereConditions.push(`o.customer_id = $${params.length + 1}`);
      params.push(customerId);
    }

    // Pazaryeri filtresi
    if (orderType === 'pazaryeri') {
      whereConditions.push(`o.customer_id IS NULL`);
    } else if (orderType === 'normal') {
      whereConditions.push(`o.customer_id IS NOT NULL`);
    }

    // WHERE koşullarını ekle
    if (whereConditions.length > 0) {
      baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Group by ve order by ekle
    baseQuery += `
      GROUP BY o.id, o.order_code, c.name, o.order_date, o.total_amount, o.status, o.notes, o.production_quantity${hasSkipProductionColumn ? ', o.skip_production' : ''}
      ORDER BY o.order_date DESC
    `;

    // Limit ekle
    if (limit) {
      baseQuery += ` LIMIT ${parseInt(limit)}`;
    }

    // Siparişleri getir
    const orders = await query(baseQuery, params);

    // Pazaryeri siparişleri için özel formatlama
    const formattedOrders = orders.rows.map(order => {
      const isMarketplace = !order.customer_name || order.customer_name === 'Pazaryeri Müşterisi';
      
      // Pazaryeri bilgisini notlardan çıkar
      let pazaryeri = '';
      if (isMarketplace && order.notes) {
        const pazaryeriMatch = order.notes.match(/Pazaryeri:\s*([^|]+)/);
        if (pazaryeriMatch) {
          pazaryeri = pazaryeriMatch[1].trim();
        }
      }

      const baseOrder = {
        id: order.order_code,  // order_code kullan, database ID değil
        orderCode: order.order_code,
        customerName: order.customer_name,
        orderDate: new Date(order.order_date).toLocaleDateString('tr-TR'),
        totalAmount: parseFloat(order.total_amount),
        status: order.status,
        production_quantity: parseInt(order.production_quantity) || 0,
        skip_production: order.skip_production || false,
        products: order.products[0] === null ? [] : order.products.map(product => ({
          ...product,
          capacity: parseInt(product.capacity) || 0,
          stock_quantity: parseInt(product.stock_quantity) || 0
        }))
      };

      // Pazaryeri siparişi ise ek bilgiler ekle
      if (isMarketplace) {
        return {
          ...baseOrder,
          pazaryeri,
          productCode: baseOrder.products[0]?.code || '',
          productType: baseOrder.products[0]?.name || '',
          quantity: baseOrder.products[0]?.quantity || 0,
          salePrice: baseOrder.products[0]?.unit_price || 0
        };
      }

      return baseOrder;
    });

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('Siparişler getirilirken hata:', error);
    console.error('Hata detayı:', {
      message: error instanceof Error ? error.message : 'Bilinmeyen hata',
      stack: error instanceof Error ? error.stack : 'Stack bulunamadı',
      name: error instanceof Error ? error.name : 'Bilinmeyen hata türü'
    });
    
    return NextResponse.json(
      { 
        error: 'Siparişler getirilemedi',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
}

// Yeni sipariş ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      customerId,
      totalAmount,
      notes,
      items,
      orderType,
      paymentStatus = 'Ödeme Bekliyor'
    } = body;
    
    // Pazaryeri siparişi için özel kontroller
    const isMarketplaceOrder = orderType === 'pazaryeri' || customerId === null;
    
    // Normal sipariş için müşteri ID gerekli
    if (!isMarketplaceOrder && !customerId) {
      return NextResponse.json(
        { error: 'Müşteri ID gerekli' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'En az bir ürün eklenmeli' },
        { status: 400 }
      );
    }

    // Ürünlerin geçerliliğini kontrol et
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        return NextResponse.json(
          { error: 'Ürün bilgileri eksik veya hatalı' },
          { status: 400 }
        );
      }

      // Ürünün varlığını kontrol et
      const productCheck = await query(`
        SELECT id FROM products WHERE id = $1
      `, [item.productId]);

      if (productCheck.rowCount === 0) {
        return NextResponse.json(
          { error: `Ürün bulunamadı: ${item.productId}` },
          { status: 400 }
        );
      }
    }
    
    // Varsayılan değerleri ayarla
    const status = 'Onay Bekliyor';
    
    // Sipariş kodunu otomatik oluştur
    const getNextOrderCode = async () => {
      const prefix = isMarketplaceOrder ? 'PAZ' : 'SIP';
      
      // En son sipariş kodunu bul
      const lastOrderResult = await query(`
        SELECT order_code 
        FROM orders 
        WHERE order_code LIKE $1 
        ORDER BY order_code DESC 
        LIMIT 1
      `, [`${prefix}-%`]);

      let nextNumber = 1;
      if (lastOrderResult.rows.length > 0) {
        const lastCode = lastOrderResult.rows[0].order_code;
        const lastNumber = parseInt(lastCode.split('-')[1]);
        nextNumber = lastNumber + 1;
      }

      return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
    };
    
    const orderCode = await getNextOrderCode();
    const orderDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
    
    // Transaction başlat
    await query('BEGIN');
    
    try {
      // Ana sipariş kaydını oluştur
      const orderResult = await query(`
        INSERT INTO orders (
          order_code, customer_id, order_date, 
          total_amount, status, notes, payment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        orderCode, 
        isMarketplaceOrder ? null : customerId, 
        orderDate,
        totalAmount, 
        status, 
        notes || '', 
        paymentStatus
      ]);
      
      const orderId = orderResult.rows[0].id;
      
      // Sipariş ürünlerini ekle
      if (items && items.length > 0) {
        for (const item of items) {
          console.log('Sipariş ürünü ekleniyor:', {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          });
          
          // Ürün bilgilerini al
          const productInfo = await query(`
            SELECT product_code, product_type 
            FROM products 
            WHERE id = $1
          `, [item.productId]);
          
          const productCode = productInfo.rows[0]?.product_code || '';
          const productName = productInfo.rows[0]?.product_type || '';
          
          await query(`
            INSERT INTO order_items (
              order_id, product_id, product_code, product_name, quantity, unit_price
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            orderId, item.productId, productCode, productName, item.quantity, item.unitPrice
          ]);

          // *** YENİ: ÜRÜN STOK REZERVASYONU ***
          console.log(`🎯 Ürün stoğu rezerve ediliyor: ${item.productId} - ${item.quantity} adet`);
          await manageStock(
            item.productId,
            item.quantity,
            StockOperation.RESERVE
          );
          
          // *** YENİ YAKLAŞIM: FİLAMENT STOKU SİPARİŞ OLUŞTURULDUĞUNDA DÜŞÜRÜLMEZ ***
          // Filament stoku sadece "Hazırlandı" durumuna geçildiğinde düşürülecek
          console.log('📦 Filament stoku henüz düşürülmedi - "Hazırlandı" durumunda düşürülecek');
        }
      }
      
      // Transaction'ı tamamla
      await query('COMMIT');
      
      // Tüm detaylarıyla birlikte siparişi döndür
      const completeOrderResult = await query(`
        SELECT o.*, 
          c.name as customer_name,
          c.phone as customer_phone,
          (
            SELECT json_agg(json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_code', p.product_code,
              'product_name', p.product_type,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price
            ))
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = o.id
          ) as items
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `, [orderId]);
      
      // Snake case'i camelCase'e dönüştür
      const { 
        order_code, customer_id, customer_name, customer_phone,
        order_date, total_amount, payment_status,
        created_at, updated_at, ...rest 
      } = completeOrderResult.rows[0];
      
      const formattedOrder = {
        ...rest,
        orderCode: order_code,
        customerId: customer_id,
        customerName: customer_name,
        customerPhone: customer_phone,
        orderDate: new Date(order_date).toLocaleDateString('tr-TR'),
        totalAmount: parseFloat(total_amount),
        paymentStatus: payment_status,
        createdAt: created_at,
        updatedAt: updated_at
      };
      
      return NextResponse.json(formattedOrder, { status: 201 });
    } catch (error) {
      // Hata oluşursa transaction'ı geri al
      await query('ROLLBACK');
      console.error('Sipariş oluşturma transaction hatası:', error);
      throw error;
    }
  } catch (error) {
    console.error('Sipariş ekleme hatası:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sipariş eklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Sipariş durumunu güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json(
        { error: 'Sipariş ID ve durum bilgisi gerekli' },
        { status: 400 }
      );
    }

    // Önce siparişin var olduğunu kontrol et
    const checkOrder = await query(`
      SELECT id FROM orders WHERE order_code = $1
    `, [id]);

    if (checkOrder.rowCount === 0) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }

    // Durumu güncelle
    await query(`
      UPDATE orders
      SET 
        status = $1,
        updated_at = NOW()
      WHERE order_code = $2
      RETURNING *
    `, [status, id]);

    // Stok güncellemeleri orders/status/route.ts dosyasında yapılıyor

    // Güncellenmiş siparişi getir
    const updatedOrder = await query(`
      SELECT 
        o.id,
        o.order_code,
        c.name as customer_name,
        o.order_date,
        o.total_amount,
        o.status,
        json_agg(
          json_build_object(
            'code', p.product_code,
            'name', p.product_type,
            'quantity', oi.quantity,
            'capacity', p.capacity,
            'stock_quantity', COALESCE(i.quantity, 0)
          )
        ) as products
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE o.order_code = $1
      GROUP BY o.id, o.order_code, c.name, o.order_date, o.total_amount, o.status
    `, [id]);

    const formattedOrder = {
      id: updatedOrder.rows[0].order_code,
      customerName: updatedOrder.rows[0].customer_name,
      orderDate: new Date(updatedOrder.rows[0].order_date).toLocaleDateString('tr-TR'),
      totalAmount: parseFloat(updatedOrder.rows[0].total_amount),
      status: updatedOrder.rows[0].status,
      products: updatedOrder.rows[0].products[0] === null ? [] : updatedOrder.rows[0].products.map(product => ({
        ...product,
        capacity: parseInt(product.capacity) || 0,
        stock_quantity: parseInt(product.stock_quantity) || 0
      }))
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Sipariş güncellenirken hata:', error);
    return NextResponse.json(
      { error: 'Sipariş güncellenemedi' },
      { status: 500 }
    );
  }
}

// Sipariş sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderCode = searchParams.get('id');
    
    if (!orderCode) {
      return NextResponse.json(
        { error: 'Sipariş kodu gerekli' },
        { status: 400 }
      );
    }
    
    // Transaction başlat
    await query('BEGIN');
    
    try {
      // Önce order_id'yi ve durumunu bul
      const orderResult = await query(`
        SELECT id, status FROM orders WHERE order_code = $1
      `, [orderCode]);

      if (orderResult.rowCount === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: 'Sipariş bulunamadı' },
          { status: 404 }
        );
      }

      const orderId = orderResult.rows[0].id;
      const orderStatus = orderResult.rows[0].status;

      // Sipariş oluşturulurken her durumda stok düşürüldüğü için
      // silinirken de her durumda stok iadesi yapılmalı
      console.log(`🔄 SİPARİŞ SİLİNİYOR: Stok iadesi yapılıyor... (Durum: ${orderStatus})`);
      await handleOrderStock(orderId, orderStatus, 'İptal');

      // *** YENİ YAKLAŞIM: FİLAMENT STOKU SİPARİŞ OLUŞTURULDUĞUNDA DÜŞÜRÜLMEZ ***
      // Bu yüzden sipariş silindiğinde filament stok iadesi yapılmaz
      console.log('📦 Filament stok iadesi gerekmiyor - sipariş oluşturulurken filament stoku düşürülmemişti');

      // Siparişi sil
      await query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
      await query(`DELETE FROM orders WHERE id = $1`, [orderId]);

      // Transaction'ı tamamla
      await query('COMMIT');

      return NextResponse.json({ 
        success: true,
        message: 'Sipariş başarıyla silindi'
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Sipariş silme hatası:', error);
    return NextResponse.json(
      { error: 'Sipariş silinemedi' },
      { status: 500 }
    );
  }
} 