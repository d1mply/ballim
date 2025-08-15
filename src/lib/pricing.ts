// Fiyatlama sistemi için yardımcı fonksiyonlar
import { query } from './db';

export interface Product {
  id: number;
  capacity: number; // Gram cinsinden ürün ağırlığı (eski sistem)
  piece_gram?: number; // Adet başı gram (yeni sistem - öncelikli)
}

export interface CustomerInfo {
  id: number;
  customer_category: 'normal' | 'wholesale';
  discount_rate?: number;
}

export interface FilamentPrice {
  type: string;
  price: number;
}

export interface WholesalePriceRange {
  id: number;
  minGram: number;
  maxGram: number;
  price: number;
  isActive: boolean;
}

/**
 * Normal müşteri için fiyat hesapla
 * @param product Ürün bilgisi (gram ağırlığı içermeli)
 * @param quantity Sipariş adedi
 * @param filamentPrices Müşteriye özel filament fiyatları
 * @param filamentType Kullanılan filament tipi
 * @returns Hesaplanan fiyat
 */
export async function calculateNormalCustomerPrice(
  product: Product,
  quantity: number,
  filamentPrices: FilamentPrice[],
  filamentType: string
): Promise<number> {
  // Müşteriye özel filament fiyatını bul
  const filamentPrice = filamentPrices.find(fp => fp.type === filamentType);
  
  if (!filamentPrice) {
    console.warn(`${filamentType} filament fiyatı bulunamadı. Varsayılan 8₺/gr kullanılıyor.`);
    // Varsayılan fiyat kullan
    const gramsPerPiece = product.piece_gram || product.capacity || 0;
    const totalGrams = gramsPerPiece * quantity;
    return totalGrams * 8; // Varsayılan 8₺/gr
  }
  
  // Ürün ağırlığını doğru şekilde al
  const gramsPerPiece = product.piece_gram || product.capacity || 0;
  const totalGrams = gramsPerPiece * quantity;
  
  // Toplam fiyat = toplam gram × gram başı fiyat
  const totalPrice = totalGrams * filamentPrice.price;
  
  console.log(`🧮 Normal Müşteri Fiyat Hesaplama:
    - Ürün ağırlığı: ${gramsPerPiece}gr/adet
    - Sipariş adedi: ${quantity}
    - Toplam gram: ${totalGrams}gr
    - Filament: ${filamentType}
    - Gram başı fiyat: ${filamentPrice.price}₺
    - Toplam fiyat: ${totalPrice}₺`);
  
  return totalPrice;
}

/**
 * Toptancı müşteri için fiyat hesapla
 * @param product Ürün bilgisi (gram ağırlığı içermeli)
 * @param quantity Sipariş adedi
 * @param discountRate İskonto oranı (örn: 60 = %60)
 * @returns Hesaplanan fiyat
 */
export async function calculateWholesaleCustomerPrice(
  product: Product,
  quantity: number,
  discountRate: number
): Promise<number> {
  // Ürün ağırlığını doğru şekilde al
  const gramsPerPiece = product.piece_gram || product.capacity || 0;
  
  // Ürün ağırlığı temelinde gram aralığını bul (adet bazında, toplam değil)
  const priceRanges = await query(`
    SELECT min_gram, max_gram, price
    FROM wholesale_price_ranges
    WHERE is_active = true
    AND $1 >= min_gram AND $1 < max_gram
    ORDER BY min_gram ASC
  `, [gramsPerPiece]); // Toplam gram değil, adet başı gram
  
  if (priceRanges.rowCount === 0) {
    throw new Error(`${gramsPerPiece}gr için uygun fiyat aralığı bulunamadı`);
  }
  
  const priceRange = priceRanges.rows[0];
  const basePricePerQuantity = priceRange.price; // Bu aralıktaki temel fiyat (toplam sipariş için)
  
  // İskonto uygula: toplam fiyat × (1 - iskonto/100)
  const discountMultiplier = 1 - (discountRate / 100);
  const finalPrice = basePricePerQuantity * discountMultiplier * quantity; // Adet ile çarp
  
  console.log(`🧮 Toptancı Fiyat Hesaplama:
    - Ürün ağırlığı: ${gramsPerPiece}gr/adet
    - Sipariş adedi: ${quantity}
    - Toplam gram: ${gramsPerPiece * quantity}gr
    - Gram aralığı: ${priceRange.min_gram}-${priceRange.max_gram}gr
    - Temel fiyat: ${basePricePerQuantity}₺/adet
    - İskonto oranı: %${discountRate}
    - İskonto çarpanı: ${discountMultiplier}
    - Final fiyat: ${finalPrice}₺ (${quantity} adet)`);
  
  return finalPrice;
}

/**
 * Müşteri kategorisine göre otomatik fiyat hesaplama
 * @param customerId Müşteri ID'si
 * @param productId Ürün ID'si
 * @param quantity Sipariş adedi
 * @param filamentType Filament tipi (normal müşteriler için gerekli)
 * @returns Hesaplanan fiyat
 */
export async function calculateOrderItemPrice(
  customerId: number | null,
  productId: number,
  quantity: number,
  filamentType?: string
): Promise<number> {
  // Ürün bilgilerini al
  const productResult = await query(`
    SELECT id, capacity, piece_gram
    FROM products
    WHERE id = $1
  `, [productId]);
  
  if (productResult.rowCount === 0) {
    throw new Error(`Ürün bulunamadı: ${productId}`);
  }
  
  const product: Product = {
    id: productResult.rows[0].id,
    capacity: productResult.rows[0].capacity || 5, // Varsayılan 5gr
    piece_gram: productResult.rows[0].piece_gram || productResult.rows[0].capacity || 5 // piece_gram öncelikli
  };
  
  // Pazaryeri siparişi ise sabit fiyat
  if (!customerId) {
    return 0.01; // Pazaryeri siparişleri için minimal fiyat
  }
  
  // Müşteri bilgilerini al
  const customerResult = await query(`
    SELECT id, customer_category, discount_rate
    FROM customers
    WHERE id = $1
  `, [customerId]);
  
  if (customerResult.rowCount === 0) {
    throw new Error(`Müşteri bulunamadı: ${customerId}`);
  }
  
  const customer: CustomerInfo = {
    id: customerResult.rows[0].id,
    customer_category: customerResult.rows[0].customer_category || 'normal',
    discount_rate: customerResult.rows[0].discount_rate || 0
  };
  
  if (customer.customer_category === 'wholesale') {
    // Toptancı fiyatlandırması
    return await calculateWholesaleCustomerPrice(product, quantity, customer.discount_rate || 0);
  } else {
    // Normal müşteri fiyatlandırması
    if (!filamentType) {
      throw new Error('Normal müşteriler için filament tipi gerekli');
    }
    
    console.log(`🔍 Normal müşteri fiyat hesaplama başlıyor:
      - Müşteri ID: ${customerId}
      - Ürün ID: ${productId}
      - Adet: ${quantity}
      - Filament: ${filamentType}`);
    
    // Müşteriye özel filament fiyatlarını al
    const filamentPricesResult = await query(`
      SELECT filament_type, price_per_gram
      FROM customer_filament_prices
      WHERE customer_id = $1
    `, [customerId]);
    
    console.log(`📊 Müşteri filament fiyatları:`, filamentPricesResult.rows);
    
    const filamentPrices: FilamentPrice[] = filamentPricesResult.rows.map(row => ({
      type: row.filament_type,
      price: row.price_per_gram
    }));
    
    const result = await calculateNormalCustomerPrice(product, quantity, filamentPrices, filamentType);
    console.log(`💰 Hesaplanan fiyat: ${result}₺`);
    
    return result;
  }
}

/**
 * Toptancı müşteri için fiyat bilgisi getir (ön görüntüleme için)
 * @param customerId Müşteri ID'si
 * @param productId Ürün ID'si
 * @param quantity Sipariş adedi
 * @returns Fiyat detayları
 */
export async function getWholesalePriceDetails(
  customerId: number,
  productId: number,
  quantity: number
): Promise<{
  totalGrams: number;
  basePrice: number;
  discountRate: number;
  finalPrice: number;
  priceRange: string;
}> {
  // Ürün ve müşteri bilgilerini al
  const [productResult, customerResult] = await Promise.all([
    query(`SELECT capacity, piece_gram FROM products WHERE id = $1`, [productId]),
    query(`SELECT discount_rate FROM customers WHERE id = $1`, [customerId])
  ]);
  
  if (productResult.rowCount === 0 || customerResult.rowCount === 0) {
    throw new Error('Ürün veya müşteri bulunamadı');
  }
  
  const product = productResult.rows[0];
  const customer = customerResult.rows[0];
  
  // Ürün ağırlığını doğru şekilde al
  const gramsPerPiece = product.piece_gram || product.capacity || 0;
  const totalGrams = gramsPerPiece * quantity;
  
  // Gram aralığı fiyatını bul (adet bazında)
  const priceRangeResult = await query(`
    SELECT min_gram, max_gram, price
    FROM wholesale_price_ranges
    WHERE is_active = true
    AND $1 >= min_gram AND $1 < max_gram
  `, [gramsPerPiece]); // adet başı gram ile kontrol et
  
  if (priceRangeResult.rowCount === 0) {
    throw new Error(`${gramsPerPiece}gr için fiyat aralığı bulunamadı`);
  }
  
  const priceRange = priceRangeResult.rows[0];
  const basePrice = priceRange.price;
  const discountRate = customer.discount_rate || 0;
  const finalPrice = basePrice * (1 - discountRate / 100) * quantity; // adet ile çarp
  
  return {
    totalGrams,
    basePrice,
    discountRate,
    finalPrice,
    priceRange: `${priceRange.min_gram}-${priceRange.max_gram}gr`
  };
}
