import { query } from '@/lib/db';

// Stok durumlarını takip etmek için enum
export enum StockOperation {
  RESERVE = 'reserve',           // Stoktan düş (sipariş onayında)
  PRODUCE = 'produce',          // Stoka ekle (üretim tamamlama)
  CANCEL_RESERVE = 'cancel',    // Rezervasyonu iptal et (sipariş iptali)
}

// Stok işlemlerini yönetecek ana fonksiyon
export async function manageStock(
  productId: string,
  quantity: number,
  operation: StockOperation
) {
  try {
    // Mevcut stok miktarını al
    const currentStock = await query(`
      SELECT quantity FROM inventory WHERE product_id = $1
    `, [productId]);

    let currentQuantity = 0;
    
    if (currentStock.rows.length === 0) {
      // Ürün inventory tablosunda yoksa ekle
      await query(`
        INSERT INTO inventory (product_id, quantity, updated_at)
        VALUES ($1, 0, CURRENT_TIMESTAMP)
      `, [productId]);
    } else {
      currentQuantity = parseInt(currentStock.rows[0].quantity) || 0;
    }

    let newQuantity = currentQuantity;

    switch (operation) {
      case StockOperation.RESERVE:
        // Sipariş onayında stoktan düş (negatif olabilir)
        newQuantity = currentQuantity - quantity;
        console.log(`📦 STOK REZERVE: ${productId}, ${currentQuantity} - ${quantity} = ${newQuantity}`);
        break;

      case StockOperation.PRODUCE:
        // Üretim tamamlandığında stoka ekle
        newQuantity = currentQuantity + quantity;
        console.log(`📈 STOK ARTIRMA: ${productId}, ${currentQuantity} + ${quantity} = ${newQuantity}`);
        break;

      case StockOperation.CANCEL_RESERVE:
        // Sipariş iptali - rezervasyonu geri al
        newQuantity = currentQuantity + quantity;
        console.log(`🔄 STOK İADE: ${productId}, ${currentQuantity} + ${quantity} = ${newQuantity}`);
        break;
    }

    // Stok güncelle
    await query(`
      UPDATE inventory
      SET quantity = $1, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $2
    `, [newQuantity, productId]);

    return {
      productId,
      oldQuantity: currentQuantity,
      newQuantity,
      change: quantity,
      operation
    };
  } catch (error) {
    console.error('Stok yönetimi hatası:', error);
    throw error;
  }
}

// Sipariş durumuna göre stok işlemlerini yönet
export async function handleOrderStock(
  orderId: string,
  fromStatus: string,
  toStatus: string,
  productionQuantity: number = 0,
  skipProduction: boolean = false
) {
  try {
    console.log(`🔄 STOK YÖNETİMİ: ${fromStatus} → ${toStatus}, Üretim: ${productionQuantity}, Skip: ${skipProduction}`);
    console.log('Parametre tipleri:', {
      orderId: typeof orderId,
      fromStatus: typeof fromStatus,
      toStatus: typeof toStatus,
      productionQuantity: typeof productionQuantity,
      skipProduction: typeof skipProduction,
      orderIdValue: orderId
    });
    
    // orderId'nin string olmadığı durumu kontrol et
    const orderIdStr = String(orderId);
    
    // Sipariş ürünlerini al
    const orderItems = await query(`
      SELECT oi.product_id, oi.quantity
      FROM order_items oi
      WHERE order_id = $1
    `, [orderIdStr]);

    console.log('Bulunan sipariş ürünleri:', orderItems.rows);

    const results = [];

    // DURUM 1: Üretime alındı
    if ((toStatus === 'Üretimde' || toStatus === 'uretiliyor') && 
        (fromStatus === 'Onay Bekliyor' || fromStatus === 'onay_bekliyor')) {
      
      if (skipProduction) {
        // Stoktan kullanılacak - stok zaten düşürülmüş, hiçbir şey yapma
        console.log('📦 STOKTAN KULLAN: Stok zaten rezerve edilmişti, değişiklik yok');
      } else {
        // Üretim yapılacak - stok değişmez, üretim tamamlandığında eklenecek
        console.log('🏭 ÜRETİM YAPILACAK: Stok değişmez, üretim tamamlandığında eklenecek');
      }
    }
    
    // DURUM 2: Üretim tamamlandı → Üretilen miktarı stoka ekle
    else if ((toStatus === 'Üretildi' || toStatus === 'uretildi') && 
             (fromStatus === 'Üretimde' || fromStatus === 'uretiliyor')) {
      
      // Sadece üretim yapıldıysa stoka ekle
      if (!skipProduction) {
        for (const item of orderItems.rows) {
          // Üretim miktarı belirtilmemişse sipariş miktarını kullan
          const addQuantity = productionQuantity > 0 ? productionQuantity : item.quantity;
          console.log(`🎯 ÜRETİM TAMAMLANDI: ${addQuantity} adet stoka ekleniyor...`);
          const result = await manageStock(
            item.product_id,
            addQuantity,
            StockOperation.PRODUCE
          );
          results.push(result);
        }
      } else {
        console.log('📦 STOKTAN KULLANILDI: Stok değişikliği yok');
      }
    }
    
    // DURUM 3: Sipariş iptal edildi → Rezervasyonu geri al
    else if (toStatus === 'İptal' || toStatus === 'iptal') {
      console.log('❌ SİPARİŞ İPTAL: Rezervasyon iade ediliyor...');
      for (const item of orderItems.rows) {
        const result = await manageStock(
          item.product_id,
          item.quantity,
          StockOperation.CANCEL_RESERVE
        );
        results.push(result);
      }
    }

    console.log(`📊 STOK İŞLEMLERİ TAMAMLANDI: ${results.length} ürün güncellendi`);
    return results;
  } catch (error) {
    console.error('Sipariş stok yönetimi hatası:', error);
    throw error;
  }
} 