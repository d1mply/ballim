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
  selectedFilamentBobins: { [key: string]: number }[];
}
