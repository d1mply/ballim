import { describe, it, expect } from 'vitest';
import {
  convertStatus,
  getStatusInfo,
  getStatusLabel,
  getStockColor,
  formatStockDisplay,
  formatDate,
  formatCurrency,
  formatNumber,
  safeParseInt,
  safeParseFloat,
  safeArray,
  safeObject,
} from '@/utils/helpers';
import { ORDER_STATUSES } from '@/constants';

describe('helpers.ts', () => {
  // ============================================
  // convertStatus Tests
  // ============================================
  describe('convertStatus', () => {
    it('onay_bekliyor için doğru status döndürmeli', () => {
      expect(convertStatus('onay_bekliyor')).toBe(ORDER_STATUSES.PENDING);
    });

    it('uretiliyor için doğru status döndürmeli', () => {
      expect(convertStatus('uretiliyor')).toBe(ORDER_STATUSES.PRODUCING);
    });

    it('uretildi için doğru status döndürmeli', () => {
      expect(convertStatus('uretildi')).toBe(ORDER_STATUSES.PRODUCED);
    });

    it('hazirlaniyor için doğru status döndürmeli', () => {
      expect(convertStatus('hazirlaniyor')).toBe(ORDER_STATUSES.PREPARING);
    });

    it('hazirlandi için doğru status döndürmeli', () => {
      expect(convertStatus('hazirlandi')).toBe(ORDER_STATUSES.READY);
    });

    it('bilinmeyen status için PENDING döndürmeli', () => {
      expect(convertStatus('unknown')).toBe(ORDER_STATUSES.PENDING);
    });

    it('boş string için PENDING döndürmeli', () => {
      expect(convertStatus('')).toBe(ORDER_STATUSES.PENDING);
    });
  });

  // ============================================
  // getStatusInfo Tests
  // ============================================
  describe('getStatusInfo', () => {
    it('onay_bekliyor için sarı renk döndürmeli', () => {
      const result = getStatusInfo('onay_bekliyor');
      expect(result.color).toContain('yellow');
      expect(result.bg).toContain('yellow');
    });

    it('uretiliyor için mavi renk döndürmeli', () => {
      const result = getStatusInfo('uretiliyor');
      expect(result.color).toContain('blue');
    });

    it('hazirlandi için yeşil renk döndürmeli', () => {
      const result = getStatusInfo('hazirlandi');
      expect(result.color).toContain('green');
    });

    it('bilinmeyen status için PENDING rengi döndürmeli (fallback)', () => {
      const result = getStatusInfo('unknown');
      // Unknown status PENDING'e fallback eder, PENDING sarı renkli
      expect(result.color).toContain('yellow');
    });
  });

  // ============================================
  // getStatusLabel Tests
  // ============================================
  describe('getStatusLabel', () => {
    it('onay_bekliyor için Türkçe etiket döndürmeli', () => {
      expect(getStatusLabel('onay_bekliyor')).toBe('Onay Bekliyor');
    });

    it('uretiliyor için Türkçe etiket döndürmeli', () => {
      expect(getStatusLabel('uretiliyor')).toBe('Üretimde');
    });

    it('uretildi için Türkçe etiket döndürmeli', () => {
      expect(getStatusLabel('uretildi')).toBe('Üretildi');
    });

    it('hazirlaniyor için Türkçe etiket döndürmeli', () => {
      expect(getStatusLabel('hazirlaniyor')).toBe('Hazırlanıyor');
    });

    it('hazirlandi için Türkçe etiket döndürmeli', () => {
      expect(getStatusLabel('hazirlandi')).toBe('Hazırlandı');
    });

    it('bilinmeyen status için PENDING etiketi döndürmeli (fallback)', () => {
      // Unknown status PENDING'e fallback eder
      expect(getStatusLabel('invalid')).toBe('Onay Bekliyor');
    });
  });

  // ============================================
  // getStockColor Tests
  // ============================================
  describe('getStockColor', () => {
    it('toplam stok 0 için gray döndürmeli', () => {
      expect(getStockColor(0, 0)).toContain('gray');
    });

    it('available 0 için red döndürmeli', () => {
      expect(getStockColor(0, 10)).toContain('red');
    });

    it('available < 10 için yellow döndürmeli', () => {
      expect(getStockColor(5, 0)).toContain('yellow');
    });

    it('available >= 10 için green döndürmeli', () => {
      expect(getStockColor(10, 0)).toContain('green');
    });

    it('yüksek stok için green döndürmeli', () => {
      expect(getStockColor(100, 50)).toContain('green');
    });
  });

  // ============================================
  // formatStockDisplay Tests
  // ============================================
  describe('formatStockDisplay', () => {
    it('her iki stok 0 için "Stok Yok" döndürmeli', () => {
      expect(formatStockDisplay(0, 0)).toBe('Stok Yok');
    });

    it('sadece rezerve varsa "X Rezerve" döndürmeli', () => {
      expect(formatStockDisplay(0, 10)).toBe('10 Rezerve');
    });

    it('sadece available varsa "X Adet" döndürmeli', () => {
      expect(formatStockDisplay(20, 0)).toBe('20 Adet');
    });

    it('her ikisi de varsa kombine format döndürmeli', () => {
      expect(formatStockDisplay(15, 5)).toBe('15 Adet (5 Rezerve)');
    });
  });

  // ============================================
  // formatDate Tests
  // ============================================
  describe('formatDate', () => {
    it('ISO tarih string formatlanmalı', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/); // dd.mm.yyyy format
    });

    it('saat bilgisi içermeli', () => {
      const result = formatDate('2024-06-20T14:45:00Z');
      expect(result).toMatch(/\d{2}:\d{2}/); // HH:mm format
    });
  });

  // ============================================
  // formatCurrency Tests
  // ============================================
  describe('formatCurrency', () => {
    it('TRY formatında döndürmeli', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('₺');
    });

    it('binlik ayraç içermeli', () => {
      const result = formatCurrency(1500000);
      expect(result.replace(/\s/g, '')).toMatch(/\d+[.,]\d+[.,]\d+/);
    });

    it('0 için 0 TRY döndürmeli', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('negatif sayı için formatlamalı', () => {
      const result = formatCurrency(-500);
      expect(result).toContain('-');
    });
  });

  // ============================================
  // formatNumber Tests
  // ============================================
  describe('formatNumber', () => {
    it('sayıyı Türkçe formatlamalı', () => {
      const result = formatNumber(1234567);
      expect(result).toMatch(/\d+[.,]\d+[.,]\d+/);
    });

    it('0 için "0" döndürmeli', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('küçük sayı değişmemeli', () => {
      expect(formatNumber(42)).toBe('42');
    });
  });

  // ============================================
  // safeParseInt Tests
  // ============================================
  describe('safeParseInt', () => {
    it('geçerli string sayı parse etmeli', () => {
      expect(safeParseInt('42')).toBe(42);
    });

    it('number tipini kabul etmeli', () => {
      expect(safeParseInt(100)).toBe(100);
    });

    it('geçersiz string için default döndürmeli', () => {
      expect(safeParseInt('abc')).toBe(0);
    });

    it('boş string için default döndürmeli', () => {
      expect(safeParseInt('')).toBe(0);
    });

    it('özel default değer kullanabilmeli', () => {
      expect(safeParseInt('invalid', -1)).toBe(-1);
    });

    it('ondalıklı sayıyı tam sayıya çevirmeli', () => {
      expect(safeParseInt('3.14')).toBe(3);
    });
  });

  // ============================================
  // safeParseFloat Tests
  // ============================================
  describe('safeParseFloat', () => {
    it('geçerli float string parse etmeli', () => {
      expect(safeParseFloat('3.14')).toBeCloseTo(3.14);
    });

    it('tam sayı kabul etmeli', () => {
      expect(safeParseFloat('42')).toBe(42);
    });

    it('number tipini kabul etmeli', () => {
      expect(safeParseFloat(99.99)).toBeCloseTo(99.99);
    });

    it('geçersiz string için default döndürmeli', () => {
      expect(safeParseFloat('abc')).toBe(0);
    });

    it('özel default değer kullanabilmeli', () => {
      expect(safeParseFloat('invalid', 1.5)).toBe(1.5);
    });
  });

  // ============================================
  // safeArray Tests
  // ============================================
  describe('safeArray', () => {
    it('array aynen döndürülmeli', () => {
      const arr = [1, 2, 3];
      expect(safeArray(arr)).toEqual([1, 2, 3]);
    });

    it('boş array döndürülmeli', () => {
      expect(safeArray([])).toEqual([]);
    });

    it('null için boş array döndürmeli', () => {
      expect(safeArray(null)).toEqual([]);
    });

    it('undefined için boş array döndürmeli', () => {
      expect(safeArray(undefined)).toEqual([]);
    });

    it('string için boş array döndürmeli', () => {
      expect(safeArray('not an array')).toEqual([]);
    });

    it('object için boş array döndürmeli', () => {
      expect(safeArray({ key: 'value' })).toEqual([]);
    });
  });

  // ============================================
  // safeObject Tests
  // ============================================
  describe('safeObject', () => {
    it('object aynen döndürülmeli', () => {
      const obj = { name: 'test' };
      expect(safeObject(obj, {})).toEqual({ name: 'test' });
    });

    it('null için default döndürmeli', () => {
      expect(safeObject(null, { default: true })).toEqual({ default: true });
    });

    it('undefined için default döndürmeli', () => {
      expect(safeObject(undefined, { fallback: 'yes' })).toEqual({ fallback: 'yes' });
    });

    it('string için default döndürmeli', () => {
      expect(safeObject('not object', { x: 1 })).toEqual({ x: 1 });
    });

    it('number için default döndürmeli', () => {
      expect(safeObject(42, { y: 2 })).toEqual({ y: 2 });
    });

    it('array da object olarak kabul edilmeli', () => {
      const arr = [1, 2, 3];
      expect(safeObject(arr, [])).toEqual([1, 2, 3]);
    });
  });
});
