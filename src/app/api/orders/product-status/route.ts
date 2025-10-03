import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Ürün bazlı durum güncelleme - Çoklu ürün üretimi için
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, productId, status, productionQuantity, skipProduction, selectedFilamentBobins } = body;

    // Gerekli alanları kontrol et
    if (!orderId || !productId || !status) {
      return NextResponse.json(
        { error: 'Sipariş ID, ürün ID ve durum gerekli' },
        { status: 400 }
      );
    }

    // Parametreleri dönüştür
    const orderCode = String(orderId).trim();
    const prodId = String(productId).trim();
    const newStatus = String(status).trim();

    // Transaction başlat
    await query('BEGIN');

    try {
      // 1. Sipariş koduna göre sipariş ID'sini bul
      const orderResult = await query(`
        SELECT id FROM orders WHERE order_code = $1 LIMIT 1
      `, [orderCode]);

      if (orderResult.rowCount === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: `Sipariş bulunamadı: ${orderCode}` },
          { status: 404 }
        );
      }

      const dbOrderId = orderResult.rows[0].id;

      // 2. Order_items tablosunda ürün durumunu güncelle
      const statusMapping: { [key: string]: string } = {
        'Onay Bekliyor': 'onay_bekliyor',
        'Üretimde': 'uretiliyor',
        'Üretiliyor': 'uretiliyor',
        'Üretildi': 'uretildi',
        'Hazırlanıyor': 'hazirlaniyor',
        'Hazırlandı': 'hazirlandi',
        'onay_bekliyor': 'onay_bekliyor',
        'uretiliyor': 'uretiliyor',
        'uretildi': 'uretildi',
        'hazirlaniyor': 'hazirlaniyor',
        'hazirlandi': 'hazirlandi'
      };
      
      const orderItemStatus = statusMapping[newStatus] || 'onay_bekliyor';
      
      // Mevcut ürün durumunu al
      const currentItem = await query(`
        SELECT product_id, quantity, status
        FROM order_items
        WHERE order_id = $1 AND id = $2
      `, [dbOrderId, prodId]);
      
      const currentStatus = currentItem.rows[0]?.status || 'onay_bekliyor';
      const productDbId = currentItem.rows[0]?.product_id;
      const itemQuantity = currentItem.rows[0]?.quantity || 0;
      
      await query(`
        UPDATE order_items 
        SET status = $1
        WHERE order_id = $2 AND id = $3
      `, [orderItemStatus, dbOrderId, prodId]);
      
      // FİLAMENT STOK İŞLEMİ: "uretiliyor" durumuna geçince filament düşür
      if (orderItemStatus === 'uretiliyor' && currentStatus !== 'uretiliyor' && !skipProduction && productDbId) {
        console.log('🎨 FILAMENT STOK DÜŞÜRME işlemi başlıyor:', { 
          productDbId, 
          itemQuantity,
          productionQuantity,
          selectedFilamentBobins 
        });
        
        // Ürünün filament bilgilerini al
        const productFilaments = await query(`
          SELECT pf.filament_type, pf.filament_color, pf.weight, pf.filament_density as brand
          FROM product_filaments pf
          WHERE pf.product_id = $1
        `, [productDbId]);
        
        console.log('📊 Ürün filament bilgileri:', productFilaments.rows);
        
        if (productFilaments.rows.length > 0) {
          // Gerçek üretim miktarını hesapla
          const actualQuantity = productionQuantity || itemQuantity;
          
          // Her filament için stok düşür
          for (const prodFilament of productFilaments.rows) {
            const totalWeightNeeded = prodFilament.weight * actualQuantity;
            
            console.log(`🎨 Filament: ${prodFilament.filament_type} ${prodFilament.filament_color}`);
            console.log(`   - Tabla başına: ${prodFilament.weight}g`);
            console.log(`   - Üretim miktarı: ${actualQuantity} adet`);
            console.log(`   - Toplam: ${totalWeightNeeded}g`);
            
            // Eğer selectedFilamentBobins varsa, seçilen bobinden düş
            if (selectedFilamentBobins && selectedFilamentBobins.length > 0) {
              const filamentKey = `${prodFilament.filament_type}-${prodFilament.filament_color}`;
              const selectedBobin = selectedFilamentBobins.find((b: any) => b[filamentKey]);
              
              if (selectedBobin) {
                const bobbinId = selectedBobin[filamentKey];
                
                // Bobin stok kontrolü
                const bobbinCheck = await query(`
                  SELECT remaining_weight, filament_code
                  FROM filaments 
                  WHERE id = $1
                `, [bobbinId]);
                
                if (bobbinCheck.rows.length === 0) {
                  throw new Error(`Bobin bulunamadı: ${bobbinId}`);
                }
                
                const bobbinStock = parseFloat(bobbinCheck.rows[0].remaining_weight);
                const bobbinCode = bobbinCheck.rows[0].filament_code;
                
                if (bobbinStock < totalWeightNeeded) {
                  throw new Error(`YETERSIZ FILAMENT! ${bobbinCode} (${prodFilament.filament_type}-${prodFilament.filament_color}): Mevcut ${bobbinStock}g, Gerekli ${totalWeightNeeded}g`);
                }
                
                // Seçilen bobinden düş
                await query(`
                  UPDATE filaments 
                  SET remaining_weight = remaining_weight - $1, 
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = $2
                `, [totalWeightNeeded, bobbinId]);
                
                console.log(`✅ FILAMENT DÜŞÜRÜLDÜ: ${bobbinCode} → ${bobbinStock}g - ${totalWeightNeeded}g = ${bobbinStock - totalWeightNeeded}g`);
                
                // Filament kullanım geçmişi kaydet
                await query(`
                  INSERT INTO filament_usage (
                    filament_id, product_id, order_id, usage_date, amount, description
                  )
                  VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
                `, [
                  bobbinId,
                  productDbId,
                  dbOrderId,
                  totalWeightNeeded,
                  `Sipariş ${orderCode} - ${actualQuantity} adet üretim`
                ]);
                
                console.log(`✅ Filament kullanım geçmişi kaydedildi`);
              }
            } else {
              // Otomatik bobin seç (en çok stoku olan)
              const filamentStock = await query(`
                SELECT id, remaining_weight, filament_code
                FROM filaments 
                WHERE type = $1 AND color = $2
                ORDER BY remaining_weight DESC
                LIMIT 1
              `, [prodFilament.filament_type, prodFilament.filament_color]);
              
              if (filamentStock.rows.length > 0) {
                const filament = filamentStock.rows[0];
                const bobbinStock = parseFloat(filament.remaining_weight);
                
                if (bobbinStock < totalWeightNeeded) {
                  throw new Error(`YETERSIZ FILAMENT! ${filament.filament_code} (${prodFilament.filament_type}-${prodFilament.filament_color}): Mevcut ${bobbinStock}g, Gerekli ${totalWeightNeeded}g`);
                }
                
                await query(`
                  UPDATE filaments 
                  SET remaining_weight = remaining_weight - $1, 
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = $2
                `, [totalWeightNeeded, filament.id]);
                
                console.log(`✅ FILAMENT DÜŞÜRÜLDÜ: ${filament.filament_code} → ${bobbinStock}g - ${totalWeightNeeded}g = ${bobbinStock - totalWeightNeeded}g`);
                
                // Filament kullanım geçmişi kaydet
                await query(`
                  INSERT INTO filament_usage (
                    filament_id, product_id, order_id, usage_date, amount, description
                  )
                  VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
                `, [
                  filament.id,
                  productDbId,
                  dbOrderId,
                  totalWeightNeeded,
                  `Sipariş ${orderCode} - ${actualQuantity} adet üretim (otomatik)`
                ]);
                
                console.log(`✅ Filament kullanım geçmişi kaydedildi`);
              } else {
                throw new Error(`FİLAMENT BULUNAMADI! ${prodFilament.filament_type} ${prodFilament.filament_color} stokta yok!`);
              }
            }
          }
        }
      }
      
      // STOK İŞLEMİ: "hazirlandi" veya "hazirlaniyor" durumuna geçince stok güncelle
      // VEYA "Stoktan Kullan" seçildiğinde her durumda stok işlemi yap
      if ((((orderItemStatus === 'hazirlandi' || orderItemStatus === 'hazirlaniyor') && 
          !['hazirlandi', 'hazirlaniyor'].includes(currentStatus)) || 
          (skipProduction && orderItemStatus === 'hazirlaniyor')) && productDbId) {
        console.log('🎯 HAZIRLANDI durumu - Stok işlemi:', { 
          productDbId, 
          itemQuantity, 
          productionQuantity,
          skipProduction
        });

        if (skipProduction) {
          // Stoktan kullanıldı - Stok varsa düş, yoksa rezerve et
          console.log('📦 Stoktan kullanılıyor:', itemQuantity, 'adet');
          console.log('🎯 Status:', orderItemStatus, 'Stok işlemi yapılıyor...');
          
          // Mevcut stok kontrolü
          const stockCheck = await query(`
            SELECT COALESCE(quantity, 0) as current_stock
            FROM inventory 
            WHERE product_id = $1
          `, [productDbId]);
          
          const currentStock = parseInt(stockCheck.rows[0]?.current_stock) || 0;
          
          if (currentStock > 0) {
            // Stok varsa - stoktan düş, kalanı rezerve et
            const stockToUse = Math.min(currentStock, itemQuantity);
            const remainingToReserve = itemQuantity - stockToUse;
            
            console.log(`📊 Stok hesaplama:`);
            console.log(`   - Mevcut stok: ${currentStock} adet`);
            console.log(`   - Sipariş: ${itemQuantity} adet`);
            console.log(`   - Stoktan kullanılacak: ${stockToUse} adet`);
            console.log(`   - Rezerve edilecek: ${remainingToReserve} adet`);
            
            // Stoktan düş
            await query(`
              UPDATE inventory 
              SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
              WHERE product_id = $2
            `, [stockToUse, productDbId]);
            
            console.log(`✅ STOKTAN DÜŞÜLDÜ: ${productDbId} → ${currentStock} - ${stockToUse} = ${currentStock - stockToUse} adet`);
            
            if (remainingToReserve > 0) {
              console.log(`ℹ️ REZERVE: ${remainingToReserve} adet rezerve edildi (stok yetersizdi)`);
            }
          } else {
            // Stok yoksa - sadece rezerve et
            console.log(`⚠️ STOK YOK: ${itemQuantity} adet rezerve edildi`);
          }
          
          console.log(`ℹ️ REZERVE STOK: Status 'hazirlandi' olduğu için rezerve hesaplamasından çıkar`);
        } else {
          // Üretim yapıldı - Stok üretimi mi, müşteri siparişi mi kontrol et
          const isStockOrder = orderCode.startsWith('STK-');
          const prodQty = productionQuantity || itemQuantity;
          
          let netChange;
          if (isStockOrder) {
            // Stok üretimi - Sadece üretilen miktar stoka eklenir (teslim yok)
            netChange = prodQty;
            console.log('🏭 STOK ÜRETİMİ:');
            console.log(`   - Üretilen: ${prodQty} adet`);
            console.log(`   - Teslim: 0 adet (stok için üretim)`);
            console.log(`   - Net değişim: +${netChange} adet`);
          } else {
            // Müşteri siparişi - Üretilen - Teslim edilen
            netChange = prodQty - itemQuantity;
            console.log('🏭 MÜŞTERİ SİPARİŞİ:');
            console.log(`   - Üretilen: ${prodQty} adet`);
            console.log(`   - Teslim: ${itemQuantity} adet`);
            console.log(`   - Net değişim: ${netChange > 0 ? '+' : ''}${netChange} adet`);
          }
          
          // Net değişimi stoka uygula
          if (netChange !== 0) {
            await query(`
              INSERT INTO inventory (product_id, quantity, updated_at)
              VALUES ($1, $2, CURRENT_TIMESTAMP)
              ON CONFLICT (product_id) 
              DO UPDATE SET 
                quantity = inventory.quantity + $2,
                updated_at = CURRENT_TIMESTAMP
            `, [productDbId, netChange]);
            
            console.log(`✅ STOK GÜNCELLENDİ: Net ${netChange > 0 ? '+' : ''}${netChange} adet`);
          } else {
            console.log(`✅ STOK DEĞİŞMEDİ: Üretim = Sipariş (${prodQty} adet)`);
          }
        }
      }

      // 3. Tüm ürünlerin durumunu kontrol et ve sipariş durumunu güncelle
      const allItems = await query(`
        SELECT status FROM order_items WHERE order_id = $1
      `, [dbOrderId]);

      // Tüm ürünler aynı durumdaysa sipariş durumunu da güncelle
      const allStatuses = allItems.rows.map((item: any) => item.status);
      const allSame = allStatuses.every((s: string) => s === orderItemStatus);

      if (allSame) {
        // API format'a çevir
        const apiStatusMapping: { [key: string]: string } = {
          'onay_bekliyor': 'Onay Bekliyor',
          'uretiliyor': 'Üretimde',
          'uretildi': 'Üretildi',
          'hazirlaniyor': 'Hazırlanıyor',
          'hazirlandi': 'Hazırlandı'
        };
        
        const apiStatus = apiStatusMapping[orderItemStatus] || 'Onay Bekliyor';
        
        await query(`
          UPDATE orders 
          SET status = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [apiStatus, dbOrderId]);
        
        console.log(`✅ Sipariş durumu da güncellendi: ${apiStatus}`);
      }

      // Transaction'ı tamamla
      await query('COMMIT');
      console.log('✅ Transaction tamamlandı');

      return NextResponse.json({
        success: true,
        message: `Ürün durumu "${newStatus}" olarak güncellendi`
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      console.error('❌ Transaction hatası:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Ürün durum güncelleme hatası:', error);
    
    return NextResponse.json(
      { 
        error: 'Ürün durumu güncellenirken bir hata oluştu: ' + 
               (error instanceof Error ? error.message : 'Bilinmeyen hata')
      },
      { status: 500 }
    );
  }
}