import { describe, it, expect } from 'vitest';
import {
  parseIntSafe,
  requireString,
  requirePositiveInt,
} from '@/lib/validation';

describe('validation.ts', () => {
  // ============================================
  // parseIntSafe Tests
  // ============================================
  describe('parseIntSafe', () => {
    describe('başarılı senaryolar', () => {
      it('geçerli sayı string ile doğru parse etmeli', () => {
        expect(parseIntSafe('123', 'testField')).toBe(123);
      });

      it('negatif sayı string ile doğru parse etmeli', () => {
        expect(parseIntSafe('-456', 'testField')).toBe(-456);
      });

      it('sıfır string ile 0 döndürmeli', () => {
        expect(parseIntSafe('0', 'testField')).toBe(0);
      });

      it('boşluklu sayı string ile doğru parse etmeli', () => {
        expect(parseIntSafe('  42  ', 'testField')).toBe(42);
      });
    });

    describe('hata senaryoları', () => {
      it('null değer için hata fırlatmalı', () => {
        expect(() => parseIntSafe(null, 'testField'))
          .toThrow('testField gerekli');
      });

      it('geçersiz string için hata fırlatmalı', () => {
        expect(() => parseIntSafe('abc', 'testField'))
          .toThrow('testField geçerli bir sayı olmalı');
      });

      it('boş string için hata fırlatmalı', () => {
        expect(() => parseIntSafe('', 'testField'))
          .toThrow('testField geçerli bir sayı olmalı');
      });

      it('field adını hata mesajında göstermeli', () => {
        expect(() => parseIntSafe(null, 'müşteriId'))
          .toThrow('müşteriId gerekli');
      });
    });
  });

  // ============================================
  // requireString Tests
  // ============================================
  describe('requireString', () => {
    describe('başarılı senaryolar', () => {
      it('geçerli string döndürmeli', () => {
        expect(requireString('hello', 'testField')).toBe('hello');
      });

      it('string trim edilmiş döndürmeli', () => {
        expect(requireString('  hello world  ', 'testField')).toBe('hello world');
      });

      it('sayı içeren string kabul etmeli', () => {
        expect(requireString('test123', 'testField')).toBe('test123');
      });
    });

    describe('hata senaryoları', () => {
      it('boş string için hata fırlatmalı', () => {
        expect(() => requireString('', 'testField'))
          .toThrow('testField gerekli');
      });

      it('sadece boşluk string için hata fırlatmalı', () => {
        expect(() => requireString('   ', 'testField'))
          .toThrow('testField gerekli');
      });

      it('number tip için hata fırlatmalı', () => {
        expect(() => requireString(123, 'testField'))
          .toThrow('testField gerekli');
      });

      it('null için hata fırlatmalı', () => {
        expect(() => requireString(null, 'testField'))
          .toThrow('testField gerekli');
      });

      it('undefined için hata fırlatmalı', () => {
        expect(() => requireString(undefined, 'testField'))
          .toThrow('testField gerekli');
      });

      it('object için hata fırlatmalı', () => {
        expect(() => requireString({}, 'testField'))
          .toThrow('testField gerekli');
      });
    });
  });

  // ============================================
  // requirePositiveInt Tests
  // ============================================
  describe('requirePositiveInt', () => {
    describe('başarılı senaryolar', () => {
      it('pozitif tam sayı kabul etmeli', () => {
        expect(requirePositiveInt(1, 'testField')).toBe(1);
      });

      it('büyük pozitif tam sayı kabul etmeli', () => {
        expect(requirePositiveInt(999999, 'testField')).toBe(999999);
      });
    });

    describe('hata senaryoları', () => {
      it('sıfır için hata fırlatmalı', () => {
        expect(() => requirePositiveInt(0, 'testField'))
          .toThrow('testField pozitif tam sayı olmalı');
      });

      it('negatif sayı için hata fırlatmalı', () => {
        expect(() => requirePositiveInt(-5, 'testField'))
          .toThrow('testField pozitif tam sayı olmalı');
      });

      it('ondalıklı sayı için hata fırlatmalı', () => {
        expect(() => requirePositiveInt(3.14, 'testField'))
          .toThrow('testField pozitif tam sayı olmalı');
      });

      it('NaN için hata fırlatmalı', () => {
        expect(() => requirePositiveInt(NaN, 'testField'))
          .toThrow('testField pozitif tam sayı olmalı');
      });

      it('Infinity için hata fırlatmalı', () => {
        expect(() => requirePositiveInt(Infinity, 'testField'))
          .toThrow('testField pozitif tam sayı olmalı');
      });
    });
  });
});
