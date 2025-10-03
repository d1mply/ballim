// Sabit değerler - Clean Code için merkezi constants

export const ORDER_STATUSES = {
  PENDING: 'onay_bekliyor',
  PRODUCING: 'uretiliyor', 
  PRODUCED: 'uretildi',
  PREPARING: 'hazirlaniyor',
  READY: 'hazirlandi'
} as const;

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUSES.PENDING]: 'Onay Bekliyor',
  [ORDER_STATUSES.PRODUCING]: 'Üretimde',
  [ORDER_STATUSES.PRODUCED]: 'Üretildi',
  [ORDER_STATUSES.PREPARING]: 'Hazırlanıyor',
  [ORDER_STATUSES.READY]: 'Hazırlandı'
} as const;

export const STATUS_COLORS = {
  [ORDER_STATUSES.PENDING]: { color: 'text-yellow-600', bg: 'bg-yellow-100' },
  [ORDER_STATUSES.PRODUCING]: { color: 'text-blue-600', bg: 'bg-blue-100' },
  [ORDER_STATUSES.PRODUCED]: { color: 'text-purple-600', bg: 'bg-purple-100' },
  [ORDER_STATUSES.PREPARING]: { color: 'text-orange-600', bg: 'bg-orange-100' },
  [ORDER_STATUSES.READY]: { color: 'text-green-600', bg: 'bg-green-100' }
} as const;

export const ORDER_PREFIXES = {
  STOCK: 'STK',
  CUSTOMER: 'SIP'
} as const;

export const STOCK_COLORS = {
  HIGH: 'text-green-600',
  MEDIUM: 'text-yellow-600', 
  LOW: 'text-red-600',
  ZERO: 'text-gray-500'
} as const;

export const API_ENDPOINTS = {
  ORDERS: '/api/orders',
  ORDERS_PRODUCTION: '/api/orders/production',
  ORDERS_PRODUCT_STATUS: '/api/orders/product-status',
  PRODUCTS: '/api/products',
  FILAMENTS: '/api/filaments',
  INVENTORY: '/api/inventory',
  CUSTOMERS: '/api/customers'
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100
} as const;
