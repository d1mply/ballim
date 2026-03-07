// Ana tip tanımları - Clean Code için merkezi type definitions

export interface User {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

export interface Product {
  id: string;
  code: string;
  productType: string;
  image?: string;
  barcode?: string;
  capacity: number;
  dimensionX: number;
  dimensionY: number;
  dimensionZ: number;
  printTime: number;
  totalGram: number;
  pieceGram: number;
  filePath?: string;
  notes?: string;
  stockQuantity: number;
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  stockDisplay: string;
  stockColor: string;
  createdAt: string;
  updatedAt: string;
  filaments: Filament[];
}

export interface Filament {
  id: string;
  type: string;
  color: string;
  brand: string;
  weight: number;
}

export interface Order {
  id: string;
  orderCode: string;
  customerId?: string;
  customerName: string;
  status: OrderStatus;
  totalAmount: number;
  orderDate: string;
  notes?: string;
  products: OrderProduct[];
}

export type OrderItem = Order;

export interface OrderProduct {
  id: string;
  productId: string;
  productCode: string;
  productType: string;
  quantity: number;
  status: string;
  capacity?: number;
  availableStock?: number;
  reservedStock?: number;
  filaments?: Filament[];
}

export type OrderStatus = 'onay_bekliyor' | 'uretiliyor' | 'uretildi' | 'hazirlaniyor' | 'hazirlandi';

export interface StockStatus {
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  stockDisplay: string;
  stockColor: string;
}

export interface FilamentBobbin {
  id: number;
  code: string;
  name: string;
  type: string;
  color: string;
  brand: string;
  location: string;
  totalWeight: string | number;
  remainingWeight: string | number;
  quantity: number;
  criticalStock: number;
  tempRange: string;
  cap: number;
  pricePerGram: number;
  createdAt: string;
  updatedAt: string;
}

// Odemeler page types
export interface Odeme {
  id: string;
  musteri_id: string;
  musteri_adi: string;
  siparis_id: string | null;
  odeme_tarihi: string;
  tutar: number;
  odeme_yontemi: string;
  vade_ay: number | null;
  durum: 'Ödendi' | 'Beklemede' | 'İptal Edildi';
  aciklama: string | null;
  created_at: string;
}

export interface OdemeCustomer {
  id: string;
  name: string;
  company?: string;
}

export interface OdemeSiparis {
  id: string;
  musteri_id: string;
  musteri_adi: string;
  order_date: string;
  total_amount: number;
  status: string;
}

export interface OdemeFormData {
  musteri_id: string;
  siparis_id: string;
  odeme_tarihi: string;
  tutar: string;
  odeme_yontemi: string;
  vade_ay: string;
  durum: 'Ödendi' | 'Beklemede' | 'İptal Edildi';
  aciklama: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  message?: string;
}

// Form types
export interface ProductionFormData {
  productionQuantity: number;
  productionType: 'tabla' | 'adet';
  tableCount: number;
  skipProduction: boolean;
  /** Slot index -> bobin id (e.g. { "0": 5, "1": 7 }). Same type, any color. */
  selectedFilamentBobins: Record<string, number>;
}
