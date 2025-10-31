import { query } from './db';
import { logStockEvent } from './audit';

// Stok operasyonları
export enum StockOperation {
  ADD = 'ADD',           // Stoka ekle (üretim)
  REMOVE = 'REMOVE',     // Stoktan çıkar (satış/teslim)
  RESERVE = 'RESERVE',   // Rezerve et (sipariş)
  UNRESERVE = 'UNRESERVE' // Rezerve iptal et
}

// Stok durumu interface - Basitleştirilmiş
export interface StockStatus {
  productId: number;
  availableStock: number;    // Satışa hazır stok
  reservedStock: number;     // Siparişe ayrılmış stok
  totalStock: number;        // Toplam stok (available + reserved)
  stockDisplay: string;      // Görüntüleme metni
  stockColor: string;        // Stok durumu rengi
}

// Stok durumu renkleri
export const STOCK_COLORS = {
  IN_STOCK: 'text-green-600 bg-green-50',
  LOW_STOCK: 'text-yellow-600 bg-yellow-50', 
  OUT_OF_STOCK: 'text-red-600 bg-red-50',
  RESERVED: 'text-blue-600 bg-blue-50'
} as const;

// Stok durumunu getir - Basitleştirilmiş ve tutarlı
export async function getStockStatus(productId: number): Promise<StockStatus> {
  try {
    // Mevcut stok miktarını al
    let availableStock = 0;
    try {
      const inventoryResult = await query(`
        SELECT COALESCE(quantity, 0) as available_stock
        FROM inventory 
        WHERE product_id = $1
      `, [productId]);
      availableStock = parseInt(inventoryResult.rows[0]?.available_stock) || 0;
    } catch (inventoryError) {
      console.log('Inventory tablosu bulunamadı, stok 0 olarak ayarlanıyor');
      availableStock = 0;
    }
    
    // Rezerve stok miktarını hesapla - Sadece stoktan karşılanamayan kısım
    const reservedResult = await query(`
      SELECT COALESCE(SUM(quantity), 0) as total_ordered
      FROM order_items 
      WHERE product_id = $1 
      AND status IN ('onay_bekliyor', 'uretiliyor', 'uretildi', 'hazirlaniyor')
    `, [productId]);
    
    const totalOrdered = parseInt(reservedResult.rows[0]?.total_ordered) || 0;
    
    // Rezerve değişkenini tanımla
    let reservedStock = 0;
    
    // DOĞRU HESAPLAMA:
    // Eğer sipariş < stok: Mevcut stok = stok - sipariş, Rezerve = 0
    // Eğer sipariş > stok: Mevcut stok = 0, Rezerve = sipariş - stok
    if (totalOrdered <= availableStock) {
      // Sipariş stoktan karşılanabiliyor
      availableStock = availableStock - totalOrdered;
      reservedStock = 0;
    } else {
      // Sipariş stoktan karşılanamıyor
      reservedStock = totalOrdered - availableStock;
      availableStock = 0;
    }
    
    const totalStock = availableStock + reservedStock;
    
    // Stok durumunu belirle
    let stockDisplay = '';
    let stockColor = '';
    
    if (availableStock > 0) {
      if (reservedStock > 0) {
        stockDisplay = `${availableStock} adet (${reservedStock} rezerve)`;
        stockColor = STOCK_COLORS.IN_STOCK;
      } else {
        stockDisplay = `${availableStock} adet`;
        stockColor = STOCK_COLORS.IN_STOCK;
      }
    } else if (reservedStock > 0) {
      stockDisplay = `0 adet (${reservedStock} rezerve)`;
      stockColor = STOCK_COLORS.RESERVED;
    } else {
      stockDisplay = 'Stokta Yok';
      stockColor = STOCK_COLORS.OUT_OF_STOCK;
    }
    
    return {
      productId,
      availableStock,
      reservedStock,
      totalStock,
      stockDisplay,
      stockColor
    };
  } catch (error) {
    console.error('Stok durumu alınırken hata:', error);
    return {
      productId,
      availableStock: 0,
      reservedStock: 0,
      totalStock: 0,
      stockDisplay: 'Stokta Yok',
      stockColor: STOCK_COLORS.OUT_OF_STOCK
    };
  }
}

// Stok işlemi yap - Basitleştirilmiş
export async function processStockOperation(
  productId: number, 
  operation: StockOperation, 
  quantity: number
): Promise<{ success: boolean; message: string; newStock?: StockStatus }> {
  try {
    await query('BEGIN');
    
    // Mevcut stok durumunu al
    const currentStock = await getStockStatus(productId);
    
    switch (operation) {
      case StockOperation.ADD:
        // Stoka ekle (üretim)
        await query(`
          INSERT INTO inventory (product_id, quantity, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (product_id) 
          DO UPDATE SET 
            quantity = inventory.quantity + $2,
            updated_at = CURRENT_TIMESTAMP
        `, [productId, quantity]);
        break;
        
      case StockOperation.REMOVE:
        // Stoktan çıkar (satış/teslim)
        if (currentStock.availableStock < quantity) {
          await query('ROLLBACK');
          return {
            success: false,
            message: `Yetersiz stok! Mevcut: ${currentStock.availableStock}, İstenen: ${quantity}`
          };
        }
        await query(`
          UPDATE inventory 
          SET quantity = quantity - $2, updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $1
        `, [productId, quantity]);
        break;
        
      case StockOperation.RESERVE:
        // Rezerve et (sipariş verildiğinde) - Sadece order_items'da status güncellenir
        break;
        
      case StockOperation.UNRESERVE:
        // Rezerve iptal et (sipariş iptal edildiğinde) - Sadece order_items'da status güncellenir
        break;
    }
    
    await query('COMMIT');
    // Audit log
    await logStockEvent(productId, operation, quantity);
    
    // Yeni stok durumunu al
    const newStock = await getStockStatus(productId);
    
    return {
      success: true,
      message: `Stok işlemi başarılı: ${operation}`,
      newStock
    };
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('Stok işlemi hatası:', error);
    return {
      success: false,
      message: `Stok işlemi başarısız: ${error}`
    };
  }
}

// Sipariş oluşturulduğunda rezerve et - Basitleştirilmiş
export async function reserveOrderItems(orderId: number): Promise<{ success: boolean; message: string }> {
  try {
    await query('BEGIN');
    
    // Sipariş ürünlerini rezerve et (status'u onay_bekliyor yap)
    await query(`
      UPDATE order_items 
      SET status = 'onay_bekliyor'
      WHERE order_id = $1
    `, [orderId]);
    
    await query('COMMIT');
    return { success: true, message: 'Sipariş ürünleri rezerve edildi' };
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('Rezerve işlemi hatası:', error);
    return { success: false, message: `Rezerve işlemi başarısız: ${error}` };
  }
}

// Sipariş iptal edildiğinde rezerve iptal et - Basitleştirilmiş
export async function unreserveOrderItems(orderId: number): Promise<{ success: boolean; message: string }> {
  try {
    await query('BEGIN');
    
    // Sipariş ürünlerini al
    const orderItems = await query(`
      SELECT product_id, quantity, status
      FROM order_items 
      WHERE order_id = $1
    `, [orderId]);
    
    if (orderItems.rows.length === 0) {
      await query('ROLLBACK');
      return { success: false, message: 'Sipariş ürünleri bulunamadı' };
    }
    
    // Eğer ürün hazırlandı durumundaysa, stoka geri ekle
    for (const item of orderItems.rows) {
      if (item.status === 'hazirlandi') {
        await query(`
          INSERT INTO inventory (product_id, quantity, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (product_id) 
          DO UPDATE SET 
            quantity = inventory.quantity + $2,
            updated_at = CURRENT_TIMESTAMP
        `, [item.product_id, item.quantity]);
      }
    }
    
    // Sipariş ürünlerini sil
    await query(`
      DELETE FROM order_items 
      WHERE order_id = $1
    `, [orderId]);
    
    await query('COMMIT');
    return { success: true, message: 'Sipariş ürünleri rezerve iptal edildi' };
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('Rezerve iptal işlemi hatası:', error);
    return { success: false, message: `Rezerve iptal işlemi başarısız: ${error}` };
  }
}

// Üretim tamamlandığında stok işlemi - Basitleştirilmiş
export async function handleProductionComplete(
  orderId: number, 
  productId: number, 
  orderedQuantity: number, 
  productionQuantity: number
): Promise<{ success: boolean; message: string }> {
  try {
    await query('BEGIN');
    
    // 1. Üretilen miktarı stoka ekle
    await processStockOperation(productId, StockOperation.ADD, productionQuantity);
    
    // 2. Sipariş miktarını stoktan çıkar (müşteriye teslim)
    await processStockOperation(productId, StockOperation.REMOVE, orderedQuantity);
    
    // 3. order_items tablosunda status'u güncelle
    await query(`
      UPDATE order_items 
      SET status = 'hazirlandi'
      WHERE order_id = $1 AND product_id = $2
    `, [orderId, productId]);
    
    await query('COMMIT');
    
    const excessQuantity = productionQuantity - orderedQuantity;
    const message = excessQuantity > 0 
      ? `Üretim tamamlandı! ${orderedQuantity} adet teslim edildi, ${excessQuantity} adet stokta kaldı`
      : `Üretim tamamlandı! ${orderedQuantity} adet teslim edildi`;
    
    return { success: true, message };
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('Üretim tamamlama hatası:', error);
    return { success: false, message: `Üretim tamamlama başarısız: ${error}` };
  }
}

// Sipariş durumu değiştiğinde stok işlemlerini yönet - Basitleştirilmiş
export async function handleOrderStock(
  orderId: number,
  oldStatus: string,
  newStatus: string,
  productionQuantity: number,
  skipProduction: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    // Sipariş ürünlerini al
    const orderItems = await query(`
      SELECT product_id, quantity
      FROM order_items 
      WHERE order_id = $1
    `, [orderId]);
    
    if (orderItems.rows.length === 0) {
      return { success: false, message: 'Sipariş ürünleri bulunamadı' };
    }
    
    // Durum değişikliğine göre işlem yap
    for (const item of orderItems.rows) {
      // "Hazırlandı" durumuna geçerken stok işlemleri
      if ((newStatus === 'Hazırlandı' || newStatus === 'hazirlandi') && 
          (oldStatus !== 'Hazırlandı' && oldStatus !== 'hazirlandi')) {
        
        if (!skipProduction) {
          // Üretim yapıldı - stoka ekle ve sipariş miktarını çıkar
          const prodQty = productionQuantity > 0 ? productionQuantity : item.quantity;
          await processStockOperation(item.product_id, StockOperation.ADD, prodQty);
          await processStockOperation(item.product_id, StockOperation.REMOVE, item.quantity);
        } else {
          // Stoktan kullanıldı - sadece sipariş miktarını çıkar
          await processStockOperation(item.product_id, StockOperation.REMOVE, item.quantity);
        }
      }
    }
    
    return { success: true, message: 'Stok işlemleri başarılı' };
    
  } catch (error) {
    console.error('Stok işlemi hatası:', error);
    return { success: false, message: `Stok işlemi başarısız: ${error}` };
  }
}
