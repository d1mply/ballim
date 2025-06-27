import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleOrderStock } from '@/lib/stock';

// Production quantity sütununu kontrol et ve yoksa ekle
const checkAndAddProductionQuantityColumn = async () => {
  try {
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'production_quantity'
    `);

    if (checkColumn.rowCount === 0) {
      await query(`
        ALTER TABLE orders 
        ADD COLUMN production_quantity INTEGER DEFAULT 0
      `);
      console.log('production_quantity sütunu eklendi');
    }

    // skip_production sütununu da kontrol et
    const checkSkipColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'skip_production'
    `);

    if (checkSkipColumn.rowCount === 0) {
      await query(`
        ALTER TABLE orders 
        ADD COLUMN skip_production BOOLEAN DEFAULT false
      `);
      console.log('skip_production sütunu eklendi');
    }
  } catch (error) {
    console.error('Sütun kontrol/ekleme hatası:', error);
    throw error;
  }
};

export async function PUT(request: NextRequest) {
  try {
    await checkAndAddProductionQuantityColumn();

    const body = await request.json();
    console.log('🔍 Ham Request Body:', JSON.stringify(body, null, 2));

    const { orderId, status, productionQuantity = 0, skipProduction = false } = body;

    // Tip kontrolleri
    console.log('🔍 Parametreler detaylı analiz:', {
      orderId: { value: orderId, type: typeof orderId, string: String(orderId) },
      status: { value: status, type: typeof status, string: String(status) },
      productionQuantity: { value: productionQuantity, type: typeof productionQuantity, number: Number(productionQuantity) },
      skipProduction: { value: skipProduction, type: typeof skipProduction }
    });

    // Gerekli alanları kontrol et
    if (!orderId || !status) {
      console.error('❌ Eksik parametreler:', { orderId, status });
      return NextResponse.json(
        { error: 'Sipariş ID ve yeni durum gerekli' },
        { status: 400 }
      );
    }

    // Parametreleri güvenli şekilde dönüştür
    const orderCode = String(orderId).trim();
    const newStatus = String(status).trim();
    const prodQuantity = parseInt(String(productionQuantity)) || 0;

    console.log('🔄 Dönüştürülmüş parametreler:', {
      orderCode,
      newStatus,
      prodQuantity,
      skipProduction
    });

    // Transaction başlat
    await query('BEGIN');

    try {
      // 1. Sipariş koduna göre sipariş bul
      console.log('🔍 Sipariş aranıyor:', orderCode);
      
      const findOrderQuery = `
        SELECT 
          id, 
          order_code, 
          status,
          COALESCE(production_quantity, 0) as production_quantity,
          COALESCE(skip_production, false) as skip_production
        FROM orders 
        WHERE order_code = $1
        LIMIT 1
      `;
      
      console.log('🔍 SQL Sorgusu:', findOrderQuery);
      console.log('🔍 Parametreler:', [orderCode]);
      
      const orderResult = await query(findOrderQuery, [orderCode]);

      console.log('🔍 Sorgu sonucu:', {
        rowCount: orderResult.rowCount,
        rows: orderResult.rows
      });

      if (orderResult.rowCount === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: `Sipariş bulunamadı: ${orderCode}` },
          { status: 404 }
        );
      }

      const orderData = orderResult.rows[0];
      const orderId = orderData.id;
      const currentStatus = orderData.status;
      const currentSkipProduction = orderData.skip_production || false;

      console.log('✅ Sipariş bulundu:', {
        orderId,
        orderCode,
        currentStatus,
        newStatus,
        prodQuantity,
        currentSkipProduction
      });

      // 2. Sipariş durumunu güncelle
      console.log('🔄 Sipariş durumu güncelleniyor...');
      
      const updateQuery = `
        UPDATE orders 
        SET 
          status = $1,
          production_quantity = $2,
          skip_production = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE order_code = $4
        RETURNING *
      `;
      
      console.log('🔍 Güncelleme SQL:', updateQuery);
      console.log('🔍 Güncelleme parametreleri:', [newStatus, prodQuantity, skipProduction, orderCode]);

      const updateResult = await query(updateQuery, [newStatus, prodQuantity, skipProduction, orderCode]);

      if (updateResult.rowCount === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: 'Sipariş güncellenemedi' },
          { status: 500 }
        );
      }

      console.log('✅ Sipariş durumu güncellendi');

      // 3. Stok işlemleri (eğer skip edilmemişse)
      if (!skipProduction) {
        console.log('🔄 Stok işlemleri başlıyor...');
        console.log('📊 Stok işlemi parametreleri:', {
          orderId: typeof orderId === 'number' ? orderId : `"${orderId}"`,
          currentStatus: `"${currentStatus}"`,
          newStatus: `"${newStatus}"`,
          prodQuantity: prodQuantity,
          currentSkipProduction: currentSkipProduction,
          newSkipProduction: skipProduction
        });
        
        try {
          // Durum değişikliğinde mevcut skip_production değerini kullan
          const effectiveSkipProduction = newStatus === 'Üretimde' ? skipProduction : currentSkipProduction;
          
          // ÜRÜN STOK İŞLEMLERİ
          const stockResults = await handleOrderStock(
            orderId,
            currentStatus,
            newStatus,
            prodQuantity,
            effectiveSkipProduction
          );
          console.log('✅ Ürün stok işlemleri tamamlandı. Sonuçlar:', stockResults);
          
          // *** YENİ: FİLAMENT STOK İŞLEMLERİ ***
          // "Hazırlandı" durumuna geçildiğinde filament stoku düşürülür
          if (newStatus === 'Hazırlandı' || newStatus === 'hazirlandi') {
            console.log('🎯 "Hazırlandı" durumu - Filament stok düşürme işlemi başlıyor...');
            
            // Sipariş ürünlerini al
            const orderItems = await query(`
              SELECT oi.product_id, oi.quantity
              FROM order_items oi
              WHERE order_id = $1
            `, [orderId]);

            // Her ürün için filament stok düşürme
            for (const item of orderItems.rows) {
              console.log(`📦 Ürün ${item.product_id} için filament stoku düşürülüyor...`);
              
              // Bu ürünün hangi filamentleri kullandığını bul
              const productFilaments = await query(`
                SELECT pf.filament_type, pf.filament_color, pf.weight, pf.filament_density as brand
                FROM product_filaments pf
                WHERE pf.product_id = $1
              `, [item.product_id]);

              console.log(`📦 Ürün ${item.product_id} için filament bilgileri:`, productFilaments.rows);

              // Her filament için stok düşürme
              for (const prodFilament of productFilaments.rows) {
                const totalWeightNeeded = prodFilament.weight * item.quantity;
                
                console.log(`🔍 HESAPLAMA:`);
                console.log(`   - Filament weight (adet başı): ${prodFilament.weight}gr`);
                console.log(`   - Üretilen miktar: ${item.quantity} adet`);
                console.log(`   - Toplam: ${prodFilament.weight} × ${item.quantity} = ${totalWeightNeeded}gr`);
                console.log(`🎯 ${prodFilament.filament_type} ${prodFilament.filament_color} - ${totalWeightNeeded}gr düşürülecek`);
                
                // Filament stoğunu bul ve güncelle
                const filamentStock = await query(`
                  SELECT id, remaining_weight, filament_code
                  FROM filaments 
                  WHERE type = $1 AND color = $2
                  ORDER BY remaining_weight DESC
                  LIMIT 1
                `, [prodFilament.filament_type, prodFilament.filament_color]);
                
                if (filamentStock.rows.length > 0) {
                  const filament = filamentStock.rows[0];
                  const newRemainingWeight = filament.remaining_weight - totalWeightNeeded;
                  
                  console.log(`📊 STOK DURUMU:`);
                  console.log(`   - Mevcut stok: ${filament.remaining_weight}gr`);
                  console.log(`   - Düşülecek: ${totalWeightNeeded}gr`);
                  console.log(`   - Yeni stok: ${newRemainingWeight}gr`);
                  console.log(`📉 ${filament.filament_code}: ${filament.remaining_weight}gr → ${newRemainingWeight}gr`);
                  
                  // Stok güncelle
                  await query(`
                    UPDATE filaments 
                    SET remaining_weight = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                  `, [newRemainingWeight, filament.id]);
                  
                  // Filament kullanım geçmişi kaydet
                  await query(`
                    INSERT INTO filament_usage (
                      filament_id, product_id, order_id, usage_date, amount, description
                    )
                    VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
                  `, [
                    filament.id,
                    item.product_id,
                    orderId,
                    totalWeightNeeded,
                    `Sipariş ${orderCode} üretimi tamamlandı`
                  ]);
                  
                  console.log('✅ Filament stok güncellendi ve kullanım geçmişi kaydedildi');
                } else {
                  console.warn(`⚠️ UYARI: ${prodFilament.filament_type} ${prodFilament.filament_color} stokta bulunamadı!`);
                }
              }
            }
            
            console.log('✅ Filament stok düşürme işlemi tamamlandı');
          }
          
        } catch (stockError) {
          console.error('❌ Stok işlemi hatası:', stockError);
          // Stok hatası olsa bile sipariş durumunu güncelledik, transaction'ı devam ettir
        }
      } else {
        console.log('⏭️ Stok işlemleri atlandı (skipProduction: true)');
      }

      // Transaction'ı tamamla
      await query('COMMIT');
      console.log('✅ Transaction tamamlandı');

      return NextResponse.json({ 
        success: true,
        message: `Sipariş durumu "${newStatus}" olarak güncellendi`,
        order: updateResult.rows[0]
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      console.error('❌ Transaction hatası:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Genel hata:', error);
    
    // Hata detaylarını logla
    if (error instanceof Error) {
      console.error('❌ Hata mesajı:', error.message);
      console.error('❌ Hata stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Sipariş durumu güncellenirken bir hata oluştu: ' + 
               (error instanceof Error ? error.message : 'Bilinmeyen hata')
      },
      { status: 500 }
    );
  }
}