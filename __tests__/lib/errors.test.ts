import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  FilamentError,
  StockError,
  handleApiError,
  validateRequired,
  validateNumber,
  validateString,
  handleDatabaseError,
  validateFilamentData,
  validateStockOperation,
} from '@/lib/errors';

// Suppress console.error in tests
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('errors.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Error Classes Tests
  // ============================================
  describe('Error Classes', () => {
    describe('AppError', () => {
      it('varsayılan değerlerle oluşturulmalı', () => {
        const error = new AppError('Test error');
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
      });

      it('özel statusCode ile oluşturulmalı', () => {
        const error = new AppError('Not found', 404);
        expect(error.statusCode).toBe(404);
      });

      it('isOperational false olarak ayarlanabilmeli', () => {
        const error = new AppError('Critical error', 500, false);
        expect(error.isOperational).toBe(false);
      });

      it('Error sınıfından türemeli', () => {
        const error = new AppError('Test');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    describe('ValidationError', () => {
      it('400 statusCode ile oluşturulmalı', () => {
        const error = new ValidationError('Invalid input');
        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(400);
      });

      it('AppError sınıfından türemeli', () => {
        const error = new ValidationError('Test');
        expect(error).toBeInstanceOf(AppError);
      });
    });

    describe('NotFoundError', () => {
      it('404 statusCode ile oluşturulmalı', () => {
        const error = new NotFoundError('Ürün');
        expect(error.message).toBe('Ürün bulunamadı');
        expect(error.statusCode).toBe(404);
      });

      it('resource adını mesaja eklemeli', () => {
        const error = new NotFoundError('Müşteri');
        expect(error.message).toContain('Müşteri');
      });
    });

    describe('DatabaseError', () => {
      it('500 statusCode ile oluşturulmalı', () => {
        const error = new DatabaseError('Connection failed');
        expect(error.message).toBe('Veritabanı hatası: Connection failed');
        expect(error.statusCode).toBe(500);
      });
    });

    describe('FilamentError', () => {
      it('400 statusCode ile oluşturulmalı', () => {
        const error = new FilamentError('Yetersiz stok');
        expect(error.message).toBe('Filament hatası: Yetersiz stok');
        expect(error.statusCode).toBe(400);
      });
    });

    describe('StockError', () => {
      it('400 statusCode ile oluşturulmalı', () => {
        const error = new StockError('Stok yetersiz');
        expect(error.message).toBe('Stok hatası: Stok yetersiz');
        expect(error.statusCode).toBe(400);
      });
    });
  });

  // ============================================
  // handleApiError Tests
  // ============================================
  describe('handleApiError', () => {
    it('AppError için doğru response döndürmeli', () => {
      const error = new ValidationError('Geçersiz giriş');
      const result = handleApiError(error);

      expect(result).toEqual({
        success: false,
        error: 'Geçersiz giriş',
        statusCode: 400,
      });
    });

    it('standart Error için 500 döndürmeli', () => {
      const error = new Error('Beklenmeyen hata');
      const result = handleApiError(error);

      expect(result).toEqual({
        success: false,
        error: 'Beklenmeyen hata',
        statusCode: 500,
      });
    });

    it('bilinmeyen hata tipi için varsayılan mesaj döndürmeli', () => {
      const result = handleApiError('string error');

      expect(result).toEqual({
        success: false,
        error: 'Bilinmeyen hata oluştu',
        statusCode: 500,
      });
    });

    it('null için varsayılan mesaj döndürmeli', () => {
      const result = handleApiError(null);

      expect(result).toEqual({
        success: false,
        error: 'Bilinmeyen hata oluştu',
        statusCode: 500,
      });
    });
  });

  // ============================================
  // validateRequired Tests
  // ============================================
  describe('validateRequired', () => {
    it('geçerli değer için hata fırlatmamalı', () => {
      expect(() => validateRequired('value', 'field')).not.toThrow();
      expect(() => validateRequired(123, 'field')).not.toThrow();
      expect(() => validateRequired(0, 'field')).not.toThrow();
    });

    it('null için ValidationError fırlatmalı', () => {
      expect(() => validateRequired(null, 'testField'))
        .toThrow(ValidationError);
    });

    it('undefined için ValidationError fırlatmalı', () => {
      expect(() => validateRequired(undefined, 'testField'))
        .toThrow('testField gerekli');
    });

    it('boş string için ValidationError fırlatmalı', () => {
      expect(() => validateRequired('', 'testField'))
        .toThrow('testField gerekli');
    });
  });

  // ============================================
  // validateNumber Tests
  // ============================================
  describe('validateNumber', () => {
    it('geçerli sayı döndürmeli', () => {
      expect(validateNumber(42, 'field')).toBe(42);
      expect(validateNumber('42', 'field')).toBe(42);
    });

    it('string sayı dönüştürülmeli', () => {
      expect(validateNumber('123', 'field')).toBe(123);
    });

    it('geçersiz sayı için hata fırlatmalı', () => {
      expect(() => validateNumber('abc', 'field'))
        .toThrow('field geçerli bir sayı olmalı');
    });

    it('NaN için hata fırlatmalı', () => {
      expect(() => validateNumber(NaN, 'field'))
        .toThrow('field geçerli bir sayı olmalı');
    });

    describe('min kontrolü', () => {
      it('min değerinden küçük için hata fırlatmalı', () => {
        expect(() => validateNumber(5, 'field', 10))
          .toThrow('field en az 10 olmalı');
      });

      it('min değerine eşit kabul etmeli', () => {
        expect(validateNumber(10, 'field', 10)).toBe(10);
      });
    });

    describe('max kontrolü', () => {
      it('max değerinden büyük için hata fırlatmalı', () => {
        expect(() => validateNumber(100, 'field', 0, 50))
          .toThrow('field en fazla 50 olmalı');
      });

      it('max değerine eşit kabul etmeli', () => {
        expect(validateNumber(50, 'field', 0, 50)).toBe(50);
      });
    });

    it('min ve max aralığında kabul etmeli', () => {
      expect(validateNumber(25, 'field', 10, 50)).toBe(25);
    });
  });

  // ============================================
  // validateString Tests
  // ============================================
  describe('validateString', () => {
    it('geçerli string döndürmeli', () => {
      expect(validateString('hello', 'field')).toBe('hello');
    });

    it('string trim edilmeli', () => {
      expect(validateString('  hello  ', 'field')).toBe('hello');
    });

    it('sayı string\'e dönüştürülmeli', () => {
      expect(validateString(123, 'field')).toBe('123');
    });

    describe('minLength kontrolü', () => {
      it('minLength\'ten kısa için hata fırlatmalı', () => {
        expect(() => validateString('ab', 'field', 5))
          .toThrow('field en az 5 karakter olmalı');
      });

      it('minLength\'e eşit kabul etmeli', () => {
        expect(validateString('hello', 'field', 5)).toBe('hello');
      });
    });

    describe('maxLength kontrolü', () => {
      it('maxLength\'ten uzun için hata fırlatmalı', () => {
        expect(() => validateString('hello world', 'field', 1, 5))
          .toThrow('field en fazla 5 karakter olmalı');
      });

      it('maxLength\'e eşit kabul etmeli', () => {
        expect(validateString('hello', 'field', 1, 5)).toBe('hello');
      });
    });
  });

  // ============================================
  // handleDatabaseError Tests
  // ============================================
  describe('handleDatabaseError', () => {
    it('unique constraint violation (23505) için mesaj döndürmeli', () => {
      const error = handleDatabaseError({ code: '23505' });
      expect(error.message).toContain('Bu kayıt zaten mevcut');
    });

    it('foreign key violation (23503) için mesaj döndürmeli', () => {
      const error = handleDatabaseError({ code: '23503' });
      expect(error.message).toContain('İlişkili kayıt bulunamadı');
    });

    it('not null violation (23502) için mesaj döndürmeli', () => {
      const error = handleDatabaseError({ code: '23502' });
      expect(error.message).toContain('Gerekli alanlar eksik');
    });

    it('table not exists (42P01) için mesaj döndürmeli', () => {
      const error = handleDatabaseError({ code: '42P01' });
      expect(error.message).toContain('Tablo bulunamadı');
    });

    it('column not exists (42703) için mesaj döndürmeli', () => {
      const error = handleDatabaseError({ code: '42703' });
      expect(error.message).toContain('Kolon bulunamadı');
    });

    it('bilinmeyen kod için genel mesaj döndürmeli', () => {
      const error = handleDatabaseError({ code: '99999', message: 'Custom error' });
      expect(error.message).toContain('Custom error');
    });

    it('kod olmayan hata için bağlantı hatası mesajı döndürmeli', () => {
      const error = handleDatabaseError({ message: 'Connection refused' });
      expect(error.message).toContain('Connection refused');
    });

    it('boş hata için varsayılan mesaj döndürmeli', () => {
      const error = handleDatabaseError({});
      expect(error.message).toContain('Veritabanı bağlantı hatası');
    });
  });

  // ============================================
  // validateFilamentData Tests
  // ============================================
  describe('validateFilamentData', () => {
    const validData = {
      type: 'PLA',
      color: 'Kırmızı',
      brand: 'Esun',
      totalWeight: 1000,
      remainingWeight: 500,
    };

    it('geçerli data için doğru sonuç döndürmeli', () => {
      const result = validateFilamentData(validData);
      expect(result.type).toBe('PLA');
      expect(result.color).toBe('Kırmızı');
      expect(result.brand).toBe('Esun');
      expect(result.totalWeight).toBe(1000);
      expect(result.remainingWeight).toBe(500);
    });

    it('type eksik için hata fırlatmalı', () => {
      expect(() => validateFilamentData({ ...validData, type: '' }))
        .toThrow('Filament tipi gerekli');
    });

    it('color eksik için hata fırlatmalı', () => {
      expect(() => validateFilamentData({ ...validData, color: null }))
        .toThrow('Filament rengi gerekli');
    });

    it('brand eksik için hata fırlatmalı', () => {
      expect(() => validateFilamentData({ ...validData, brand: undefined }))
        .toThrow('Filament markası gerekli');
    });

    it('totalWeight 0 için hata fırlatmalı', () => {
      expect(() => validateFilamentData({ ...validData, totalWeight: 0 }))
        .toThrow('Toplam ağırlık en az 1 olmalı');
    });

    it('remainingWeight totalWeight\'ten büyük için hata fırlatmalı', () => {
      expect(() => validateFilamentData({ ...validData, remainingWeight: 1500 }))
        .toThrow('Kalan ağırlık en fazla 1000 olmalı');
    });
  });

  // ============================================
  // validateStockOperation Tests
  // ============================================
  describe('validateStockOperation', () => {
    it('geçerli add operasyonu kabul etmeli', () => {
      expect(validateStockOperation('123', 10, 'add')).toBe(10);
    });

    it('geçerli remove operasyonu kabul etmeli', () => {
      expect(validateStockOperation('123', 5, 'remove')).toBe(5);
    });

    it('productId eksik için hata fırlatmalı', () => {
      expect(() => validateStockOperation('', 10, 'add'))
        .toThrow('Ürün ID gerekli');
    });

    it('quantity 0 için hata fırlatmalı', () => {
      expect(() => validateStockOperation('123', 0, 'add'))
        .toThrow('Miktar en az 1 olmalı');
    });

    it('negatif quantity için hata fırlatmalı', () => {
      expect(() => validateStockOperation('123', -5, 'add'))
        .toThrow('Miktar en az 1 olmalı');
    });
  });
});
