// Yardımcı fonksiyonlar - Clean Code için utility functions

import { ORDER_STATUSES, ORDER_STATUS_LABELS, STATUS_COLORS } from '@/constants';

/**
 * Sipariş durumunu frontend formatına çevirir
 */
export const convertStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'onay_bekliyor': ORDER_STATUSES.PENDING,
    'uretiliyor': ORDER_STATUSES.PRODUCING,
    'uretildi': ORDER_STATUSES.PRODUCED,
    'hazirlaniyor': ORDER_STATUSES.PREPARING,
    'hazirlandi': ORDER_STATUSES.READY
  };
  
  return statusMap[status] || ORDER_STATUSES.PENDING;
};

/**
 * Sipariş durumu için renk bilgisi döndürür
 */
export const getStatusInfo = (status: string) => {
  const convertedStatus = convertStatus(status);
  return STATUS_COLORS[convertedStatus] || { color: 'text-gray-500', bg: 'bg-gray-100' };
};

/**
 * Sipariş durumu etiketi döndürür
 */
export const getStatusLabel = (status: string): string => {
  const convertedStatus = convertStatus(status);
  return ORDER_STATUS_LABELS[convertedStatus] || 'Bilinmiyor';
};

/**
 * Stok durumuna göre renk döndürür
 */
export const getStockColor = (availableStock: number, reservedStock: number): string => {
  const totalStock = availableStock + reservedStock;
  
  if (totalStock === 0) return 'text-gray-500';
  if (availableStock === 0) return 'text-red-600';
  if (availableStock < 10) return 'text-yellow-600';
  return 'text-green-600';
};

/**
 * Stok görüntüleme metni oluşturur
 */
export const formatStockDisplay = (availableStock: number, reservedStock: number): string => {
  if (availableStock === 0 && reservedStock === 0) return 'Stok Yok';
  if (availableStock === 0) return `${reservedStock} Rezerve`;
  if (reservedStock === 0) return `${availableStock} Adet`;
  return `${availableStock} Adet (${reservedStock} Rezerve)`;
};

/**
 * Tarih formatlar
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Para formatı
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount);
};

/**
 * Sayı formatı
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('tr-TR').format(num);
};

/**
 * String'i güvenli şekilde parse eder
 */
export const safeParseInt = (value: string | number, defaultValue: number = 0): number => {
  const parsed = parseInt(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * String'i güvenli şekilde parse eder (float)
 */
export const safeParseFloat = (value: string | number, defaultValue: number = 0): number => {
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Array'i güvenli şekilde kontrol eder
 */
export const safeArray = <T>(value: any): T[] => {
  return Array.isArray(value) ? value : [];
};

/**
 * Object'i güvenli şekilde kontrol eder
 */
export const safeObject = <T>(value: any, defaultValue: T): T => {
  return value && typeof value === 'object' ? value : defaultValue;
};
