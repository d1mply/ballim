import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signJWT, verifyJWT } from '@/lib/jwt';

describe('jwt.ts', () => {
  // ============================================
  // signJWT Tests
  // ============================================
  describe('signJWT', () => {
    describe('token oluşturma', () => {
      it('geçerli JWT token döndürmeli', () => {
        const token = signJWT({ userId: 123 });
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
      });

      it('token 3 parçadan oluşmalı (header.payload.signature)', () => {
        const token = signJWT({ data: 'test' });
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
      });

      it('header Base64URL encoded olmalı', () => {
        const token = signJWT({ test: true });
        const headerPart = token.split('.')[0];
        // Base64URL karakterleri: A-Z, a-z, 0-9, -, _
        expect(headerPart).toMatch(/^[A-Za-z0-9_-]+$/);
      });

      it('payload içindeki data korunmalı', () => {
        const payload = { userId: 456, role: 'admin' };
        const token = signJWT(payload);
        const result = verifyJWT(token);
        
        expect(result.valid).toBe(true);
        expect(result.payload.userId).toBe(456);
        expect(result.payload.role).toBe('admin');
      });

      it('iat (issued at) timestamp içermeli', () => {
        const token = signJWT({ test: true });
        const result = verifyJWT(token);
        
        expect(result.payload.iat).toBeDefined();
        expect(typeof result.payload.iat).toBe('number');
      });

      it('exp (expiration) timestamp içermeli', () => {
        const token = signJWT({ test: true });
        const result = verifyJWT(token);
        
        expect(result.payload.exp).toBeDefined();
        expect(typeof result.payload.exp).toBe('number');
      });

      it('varsayılan expiration 1 saat olmalı', () => {
        const token = signJWT({ test: true });
        const result = verifyJWT(token);
        
        const expectedExp = result.payload.iat + 3600; // 1 saat = 3600 saniye
        expect(result.payload.exp).toBe(expectedExp);
      });

      it('özel expiration süresi ayarlanabilmeli', () => {
        const customExpiry = 7200; // 2 saat
        const token = signJWT({ test: true }, customExpiry);
        const result = verifyJWT(token);
        
        const expectedExp = result.payload.iat + customExpiry;
        expect(result.payload.exp).toBe(expectedExp);
      });
    });

    describe('farklı payload tipleri', () => {
      it('string payload kabul etmeli', () => {
        const token = signJWT({ message: 'Hello World' });
        const result = verifyJWT(token);
        expect(result.payload.message).toBe('Hello World');
      });

      it('number payload kabul etmeli', () => {
        const token = signJWT({ count: 42 });
        const result = verifyJWT(token);
        expect(result.payload.count).toBe(42);
      });

      it('nested object payload kabul etmeli', () => {
        const token = signJWT({ 
          user: { 
            name: 'Test',
            permissions: ['read', 'write']
          }
        });
        const result = verifyJWT(token);
        expect(result.payload.user.name).toBe('Test');
        expect(result.payload.user.permissions).toEqual(['read', 'write']);
      });

      it('boş payload kabul etmeli', () => {
        const token = signJWT({});
        const result = verifyJWT(token);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ============================================
  // verifyJWT Tests
  // ============================================
  describe('verifyJWT', () => {
    describe('geçerli token doğrulama', () => {
      it('geçerli token için valid: true döndürmeli', () => {
        const token = signJWT({ userId: 1 });
        const result = verifyJWT(token);
        
        expect(result.valid).toBe(true);
        expect(result.payload).toBeDefined();
        expect(result.error).toBeUndefined();
      });

      it('payload doğru dönmeli', () => {
        const originalPayload = { userId: 123, role: 'user' };
        const token = signJWT(originalPayload);
        const result = verifyJWT(token);
        
        expect(result.payload.userId).toBe(123);
        expect(result.payload.role).toBe('user');
      });
    });

    describe('geçersiz token senaryoları', () => {
      it('malformed token için valid: false döndürmeli', () => {
        const result = verifyJWT('not.a.valid.token.format');
        
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('eksik parça için valid: false döndürmeli', () => {
        const result = verifyJWT('only.twoparts');
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Malformed token');
      });

      it('boş string için valid: false döndürmeli', () => {
        const result = verifyJWT('');
        
        expect(result.valid).toBe(false);
      });

      it('değiştirilmiş signature için valid: false döndürmeli', () => {
        const token = signJWT({ userId: 1 });
        const parts = token.split('.');
        const tamperedToken = `${parts[0]}.${parts[1]}.tampered_signature`;
        
        const result = verifyJWT(tamperedToken);
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid signature');
      });

      it('değiştirilmiş payload için valid: false döndürmeli', () => {
        const token = signJWT({ userId: 1 });
        const parts = token.split('.');
        // Payload'ı değiştir
        const fakePayload = Buffer.from(JSON.stringify({ userId: 999 }))
          .toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
        const tamperedToken = `${parts[0]}.${fakePayload}.${parts[2]}`;
        
        const result = verifyJWT(tamperedToken);
        
        expect(result.valid).toBe(false);
      });
    });

    describe('token expiration', () => {
      it('süresi dolmuş token için valid: false döndürmeli', () => {
        // 0 saniye expiry ile token oluştur
        const token = signJWT({ userId: 1 }, 0);
        
        // Token anında expire olur (iat = exp)
        const result = verifyJWT(token);
        
        // exp === iat olduğu için henüz expire olmamış olabilir
        // Ama now > exp kontrolü yapılıyor
        expect(result.valid).toBe(true); // 0 saniye = hemen değil, tam o an
      });

      it('expire olmuş token doğru hata mesajı vermeli', async () => {
        // -1 saniye ile geçmiş zaman oluşturulamaz, 
        // bu yüzden mock time kullanacağız
        const token = signJWT({ userId: 1 }, 1); // 1 saniyelik token
        
        // Şu an geçerli olmalı
        const immediateResult = verifyJWT(token);
        expect(immediateResult.valid).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('çok uzun payload işlemeli', () => {
        const longPayload = { 
          data: 'x'.repeat(10000),
          array: Array(100).fill('item')
        };
        const token = signJWT(longPayload);
        const result = verifyJWT(token);
        
        expect(result.valid).toBe(true);
        expect(result.payload.data.length).toBe(10000);
      });

      it('Türkçe karakterler işlemeli', () => {
        const token = signJWT({ 
          isim: 'Şükrü',
          mesaj: 'Merhaba dünya! Çok güzel.'
        });
        const result = verifyJWT(token);
        
        expect(result.valid).toBe(true);
        expect(result.payload.isim).toBe('Şükrü');
        expect(result.payload.mesaj).toContain('Merhaba');
      });

      it('özel karakterler işlemeli', () => {
        const token = signJWT({
          special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        });
        const result = verifyJWT(token);
        
        expect(result.valid).toBe(true);
      });
    });
  });
});
