// Error handling standardizasyonu - Clean Code için merkezi error yönetimi

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Özel error tipleri
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} bulunamadı`, 404);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(`Veritabanı hatası: ${message}`, 500);
  }
}

export class FilamentError extends AppError {
  constructor(message: string) {
    super(`Filament hatası: ${message}`, 400);
  }
}

export class StockError extends AppError {
  constructor(message: string) {
    super(`Stok hatası: ${message}`, 400);
  }
}

// Error handler fonksiyonları
export const handleApiError = (error: unknown) => {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      statusCode: 500
    };
  }

  return {
    success: false,
    error: 'Bilinmeyen hata oluştu',
    statusCode: 500
  };
};

// Validation helper'ları
export const validateRequired = (value: unknown, fieldName: string): void => {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} gerekli`);
  }
};

export const validateNumber = (value: unknown, fieldName: string, min?: number, max?: number): number => {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} geçerli bir sayı olmalı`);
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} en az ${min} olmalı`);
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} en fazla ${max} olmalı`);
  }

  return num;
};

export const validateString = (value: unknown, fieldName: string, minLength?: number, maxLength?: number): string => {
  const str = String(value).trim();
  
  if (minLength !== undefined && str.length < minLength) {
    throw new ValidationError(`${fieldName} en az ${minLength} karakter olmalı`);
  }

  if (maxLength !== undefined && str.length > maxLength) {
    throw new ValidationError(`${fieldName} en fazla ${maxLength} karakter olmalı`);
  }

  return str;
};

// PostgreSQL error interface
interface PostgresError {
  code?: string;
  message?: string;
}

// Database error handler
export const handleDatabaseError = (error: unknown): AppError => {
  console.error('Database Error:', error);

  const pgError = error as PostgresError;
  
  // PostgreSQL error codes
  if (pgError.code) {
    switch (pgError.code) {
      case '23505': // Unique constraint violation
        return new DatabaseError('Bu kayıt zaten mevcut');
      case '23503': // Foreign key constraint violation
        return new DatabaseError('İlişkili kayıt bulunamadı');
      case '23502': // Not null constraint violation
        return new DatabaseError('Gerekli alanlar eksik');
      case '42P01': // Table doesn't exist
        return new DatabaseError('Tablo bulunamadı');
      case '42703': // Column doesn't exist
        return new DatabaseError('Kolon bulunamadı');
      default:
        return new DatabaseError(pgError.message || 'Veritabanı işlemi başarısız');
    }
  }

  const errorMessage = error instanceof Error ? error.message : 'Veritabanı bağlantı hatası';
  return new DatabaseError(errorMessage);
};

// Filament input interface
interface FilamentInput {
  type?: unknown;
  color?: unknown;
  brand?: unknown;
  totalWeight?: unknown;
  remainingWeight?: unknown;
}

// Filament specific validations
export const validateFilamentData = (data: FilamentInput) => {
  validateRequired(data.type, 'Filament tipi');
  validateRequired(data.color, 'Filament rengi');
  validateRequired(data.brand, 'Filament markası');
  
  const totalWeight = validateNumber(data.totalWeight, 'Toplam ağırlık', 1);
  const remainingWeight = validateNumber(data.remainingWeight, 'Kalan ağırlık', 0, totalWeight);
  
  return {
    type: validateString(data.type, 'Tip', 1, 50),
    color: validateString(data.color, 'Renk', 1, 50),
    brand: validateString(data.brand, 'Marka', 1, 50),
    totalWeight,
    remainingWeight
  };
};

// Stock specific validations
export const validateStockOperation = (productId: string, quantity: number, operation: 'add' | 'remove') => {
  validateRequired(productId, 'Ürün ID');
  
  const qty = validateNumber(quantity, 'Miktar', 1);
  
  if (operation === 'remove' && qty <= 0) {
    throw new StockError('Çıkarılacak miktar 0\'dan büyük olmalı');
  }
  
  return qty;
};
