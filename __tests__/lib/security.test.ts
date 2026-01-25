import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SECURITY_CONFIG,
  hashPassword,
  verifyPassword,
  sanitizeInput,
  validateSQLInput,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  getClientIP,
  isSuspiciousUserAgent,
  logSecurityEvent,
  validateHoneypot,
  generateSecureToken,
  generateCSRFToken,
  validateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  removeCSRFToken,
  cleanupExpiredTokens,
  generateSecurePassword,
} from '@/lib/security';

// Suppress console output in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('security.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // SECURITY_CONFIG Tests
  // ============================================
  describe('SECURITY_CONFIG', () => {
    it('JWT_SECRET tanımlı olmalı', () => {
      expect(SECURITY_CONFIG.JWT_SECRET).toBeDefined();
      expect(typeof SECURITY_CONFIG.JWT_SECRET).toBe('string');
    });

    it('RATE_LIMIT ayarları tanımlı olmalı', () => {
      expect(SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS).toBeGreaterThan(0);
      expect(SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS).toBeGreaterThan(0);
      expect(SECURITY_CONFIG.RATE_LIMIT.BAN_THRESHOLD).toBeGreaterThan(0);
    });

    it('PASSWORD_POLICY tanımlı olmalı', () => {
      expect(SECURITY_CONFIG.PASSWORD_POLICY.MIN_LENGTH).toBeGreaterThan(0);
      expect(SECURITY_CONFIG.PASSWORD_POLICY.REQUIRE_UPPERCASE).toBeDefined();
    });
  });

  // ============================================
  // hashPassword & verifyPassword Tests
  // ============================================
  describe('hashPassword', () => {
    it('hash salt:hash formatında olmalı', () => {
      const hash = hashPassword('testpassword');
      expect(hash).toContain(':');
      const parts = hash.split(':');
      expect(parts).toHaveLength(2);
    });

    it('aynı şifre farklı hash üretmeli (random salt)', () => {
      const hash1 = hashPassword('samepassword');
      const hash2 = hashPassword('samepassword');
      expect(hash1).not.toBe(hash2);
    });

    it('hash boş olmamalı', () => {
      const hash = hashPassword('test');
      expect(hash.length).toBeGreaterThan(32);
    });
  });

  describe('verifyPassword', () => {
    it('doğru şifre için true döndürmeli', () => {
      const password = 'MySecurePassword123!';
      const hash = hashPassword(password);
      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('yanlış şifre için false döndürmeli', () => {
      const hash = hashPassword('correctpassword');
      expect(verifyPassword('wrongpassword', hash)).toBe(false);
    });

    it('boş şifre hash\'lenebilmeli', () => {
      const hash = hashPassword('');
      expect(verifyPassword('', hash)).toBe(true);
    });

    it('Türkçe karakterli şifre işlemeli', () => {
      const password = 'ŞifreÖrnekçığ123';
      const hash = hashPassword(password);
      expect(verifyPassword(password, hash)).toBe(true);
    });
  });

  // ============================================
  // sanitizeInput Tests
  // ============================================
  describe('sanitizeInput', () => {
    it('script tag\'leri temizlemeli', () => {
      const input = '<script>alert("xss")</script>test';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('iframe tag\'leri temizlemeli', () => {
      const input = '<iframe src="evil.com"></iframe>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<iframe');
    });

    it('javascript: protokolünü temizlemeli', () => {
      const input = 'javascript:alert(1)';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    it('event handler\'ları temizlemeli', () => {
      const input = '<img onerror="alert(1)" src="x">';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onerror=');
    });

    it('HTML karakterleri encode etmeli', () => {
      const input = '<div>"test" & \'quote\'</div>';
      const result = sanitizeInput(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
    });

    it('normal metni değiştirmemeli', () => {
      const input = 'Normal text 123';
      const result = sanitizeInput(input);
      expect(result).toBe('Normal text 123');
    });

    it('boşlukları trim etmeli', () => {
      const input = '  test  ';
      const result = sanitizeInput(input);
      expect(result).toBe('test');
    });
  });

  // ============================================
  // validateSQLInput Tests
  // ============================================
  describe('validateSQLInput', () => {
    it('normal input için true döndürmeli', () => {
      expect(validateSQLInput('John Doe')).toBe(true);
      expect(validateSQLInput('test@email.com')).toBe(true);
      expect(validateSQLInput('12345')).toBe(true);
    });

    it('SELECT keyword için false döndürmeli', () => {
      expect(validateSQLInput('SELECT * FROM users')).toBe(false);
    });

    it('DROP keyword için false döndürmeli', () => {
      expect(validateSQLInput('DROP TABLE users')).toBe(false);
    });

    it('UNION keyword için false döndürmeli', () => {
      expect(validateSQLInput('1 UNION SELECT')).toBe(false);
    });

    it('comment syntax için false döndürmeli', () => {
      expect(validateSQLInput('admin--')).toBe(false);
      expect(validateSQLInput('test/*comment*/')).toBe(false);
    });

    it('OR 1=1 pattern için false döndürmeli', () => {
      expect(validateSQLInput("' OR 1=1")).toBe(false);
    });

    it('INFORMATION_SCHEMA için false döndürmeli', () => {
      expect(validateSQLInput('INFORMATION_SCHEMA.tables')).toBe(false);
    });

    it('time-based injection için false döndürmeli', () => {
      expect(validateSQLInput('pg_sleep(10)')).toBe(false);
      expect(validateSQLInput('WAITFOR DELAY')).toBe(false);
    });
  });

  // ============================================
  // Rate Limiting Tests
  // ============================================
  describe('Rate Limiting', () => {
    const testIP = 'test-ip-' + Date.now();

    describe('checkRateLimit', () => {
      it('ilk istek için true döndürmeli', () => {
        const uniqueIP = 'first-' + Date.now();
        expect(checkRateLimit(uniqueIP)).toBe(true);
      });

      it('limit altında true döndürmeli', () => {
        const uniqueIP = 'multi-' + Date.now();
        for (let i = 0; i < 5; i++) {
          expect(checkRateLimit(uniqueIP)).toBe(true);
        }
      });
    });

    describe('recordFailedAttempt', () => {
      it('başarısız girişleri kaydetmeli', () => {
        const uniqueIP = 'failed-' + Date.now();
        // Hata fırlatmamalı
        expect(() => recordFailedAttempt(uniqueIP)).not.toThrow();
      });
    });

    describe('resetFailedAttempts', () => {
      it('sıfırlama sonrası çalışmaya devam etmeli', () => {
        const uniqueIP = 'reset-' + Date.now();
        recordFailedAttempt(uniqueIP);
        resetFailedAttempts(uniqueIP);
        expect(checkRateLimit(uniqueIP)).toBe(true);
      });
    });
  });

  // ============================================
  // getClientIP Tests
  // ============================================
  describe('getClientIP', () => {
    it('x-forwarded-for header\'dan IP almalı', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
            return null;
          }
        }
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('192.168.1.1');
    });

    it('cf-connecting-ip header\'ı öncelikli olmalı', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'cf-connecting-ip') return '1.2.3.4';
            if (name === 'x-forwarded-for') return '5.6.7.8';
            return null;
          }
        }
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('1.2.3.4');
    });

    it('x-real-ip header\'dan IP almalı', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-real-ip') return '10.0.0.1';
            return null;
          }
        }
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('10.0.0.1');
    });

    it('header yoksa unknown döndürmeli', () => {
      const mockRequest = {
        headers: {
          get: () => null
        }
      } as unknown as Request;

      expect(getClientIP(mockRequest)).toBe('unknown');
    });
  });

  // ============================================
  // isSuspiciousUserAgent Tests
  // ============================================
  describe('isSuspiciousUserAgent', () => {
    it('bot user agent için true döndürmeli', () => {
      expect(isSuspiciousUserAgent('Googlebot/2.1')).toBe(true);
      expect(isSuspiciousUserAgent('crawler')).toBe(true);
      expect(isSuspiciousUserAgent('spider')).toBe(true);
    });

    it('programatic tool için true döndürmeli', () => {
      expect(isSuspiciousUserAgent('curl/7.64.1')).toBe(true);
      expect(isSuspiciousUserAgent('python-requests')).toBe(true);
      expect(isSuspiciousUserAgent('Java/1.8')).toBe(true);
    });

    it('Postman için true döndürmeli', () => {
      expect(isSuspiciousUserAgent('PostmanRuntime/7.28.0')).toBe(true);
    });

    it('gerçek browser için false döndürmeli', () => {
      const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0';
      expect(isSuspiciousUserAgent(chrome)).toBe(false);
    });

    it('çok kısa user agent için true döndürmeli', () => {
      expect(isSuspiciousUserAgent('abc')).toBe(true);
    });
  });

  // ============================================
  // logSecurityEvent Tests
  // ============================================
  describe('logSecurityEvent', () => {
    it('low severity log almalı', () => {
      expect(() => logSecurityEvent('TEST_EVENT', { ip: '1.2.3.4' }, 'LOW')).not.toThrow();
    });

    it('critical severity hata fırlatmamalı', () => {
      expect(() => logSecurityEvent('CRITICAL_EVENT', { reason: 'test' }, 'CRITICAL')).not.toThrow();
    });

    it('high severity hata fırlatmamalı', () => {
      expect(() => logSecurityEvent('HIGH_EVENT', { data: 'test' }, 'HIGH')).not.toThrow();
    });
  });

  // ============================================
  // validateHoneypot Tests
  // ============================================
  describe('validateHoneypot', () => {
    it('boş string için true döndürmeli', () => {
      expect(validateHoneypot('')).toBe(true);
    });

    it('undefined için true döndürmeli', () => {
      expect(validateHoneypot(undefined as unknown as string)).toBe(true);
    });

    it('dolu değer için false döndürmeli', () => {
      expect(validateHoneypot('filled by bot')).toBe(false);
    });
  });

  // ============================================
  // Token Generation Tests
  // ============================================
  describe('generateSecureToken', () => {
    it('64 karakter hex string döndürmeli', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('her seferinde farklı token üretmeli', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateCSRFToken', () => {
    it('64 karakter hex string döndürmeli', () => {
      const token = generateCSRFToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('generateSecurePassword', () => {
    it('varsayılan 16 karakter şifre üretmeli', () => {
      const password = generateSecurePassword();
      expect(password).toHaveLength(16);
    });

    it('özel uzunlukta şifre üretebilmeli', () => {
      expect(generateSecurePassword(8)).toHaveLength(8);
      expect(generateSecurePassword(32)).toHaveLength(32);
    });

    it('her seferinde farklı şifre üretmeli', () => {
      const pw1 = generateSecurePassword();
      const pw2 = generateSecurePassword();
      expect(pw1).not.toBe(pw2);
    });
  });

  // ============================================
  // CSRF Token Store Tests
  // ============================================
  describe('CSRF Token Store', () => {
    const testSessionId = 'test-session-' + Date.now();
    const testToken = generateCSRFToken();

    it('token saklanabilmeli', () => {
      expect(() => storeCSRFToken(testSessionId, testToken)).not.toThrow();
    });

    it('saklanan token alınabilmeli', () => {
      const sessionId = 'get-test-' + Date.now();
      const token = 'stored-token-value';
      storeCSRFToken(sessionId, token);
      expect(getCSRFToken(sessionId)).toBe(token);
    });

    it('olmayan session için null döndürmeli', () => {
      expect(getCSRFToken('nonexistent-session')).toBe(null);
    });

    it('token silinebilmeli', () => {
      const sessionId = 'remove-test-' + Date.now();
      storeCSRFToken(sessionId, 'token');
      removeCSRFToken(sessionId);
      expect(getCSRFToken(sessionId)).toBe(null);
    });

    it('cleanup expired tokens çalışmalı', () => {
      expect(() => cleanupExpiredTokens()).not.toThrow();
    });
  });

  // ============================================
  // validateCSRFToken Tests
  // ============================================
  describe('validateCSRFToken', () => {
    it('eşleşen tokenlar için true döndürmeli', () => {
      const token = 'same-token-value';
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('farklı tokenlar için false döndürmeli', () => {
      expect(validateCSRFToken('token1', 'token2')).toBe(false);
    });

    it('boş request token için false döndürmeli', () => {
      expect(validateCSRFToken('', 'cookie-token')).toBe(false);
    });

    it('boş cookie token için false döndürmeli', () => {
      expect(validateCSRFToken('request-token', '')).toBe(false);
    });

    it('farklı uzunlukta tokenlar için false döndürmeli', () => {
      expect(validateCSRFToken('short', 'verylongtoken')).toBe(false);
    });
  });
});
