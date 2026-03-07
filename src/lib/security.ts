import crypto from 'crypto';

// Güvenlik Konfigürasyonu
// JWT_SECRET lazy evaluation için getter kullanıyoruz (build time hatası önleme)
let _jwtSecretCache: string | null = null;

function getJwtSecret(): string {
  if (_jwtSecretCache) return _jwtSecretCache;
  
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  // Development fallback only
  _jwtSecretCache = secret || 'DEV_ONLY_B4ll1m_2024_S3cur3_JWT_K3y';
  return _jwtSecretCache;
}

function getAdminUsername(): string {
  const val = process.env.ADMIN_USERNAME;
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_USERNAME environment variable is required in production');
  }
  return val || 'admin';
}

function getAdminPassword(): string {
  const val = process.env.ADMIN_PASSWORD;
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD environment variable is required in production');
  }
  return val || 'Admin123123123.';
}

export const SECURITY_CONFIG = {
  get ADMIN_USERNAME(): string { return getAdminUsername(); },
  get ADMIN_PASSWORD(): string { return getAdminPassword(); },
  
  // JWT Settings - Production'da JWT_SECRET environment variable ZORUNLU
  // Getter kullanarak lazy evaluation (build time'da değil, runtime'da kontrol)
  get JWT_SECRET(): string {
    return getJwtSecret();
  },
  JWT_EXPIRES_IN: '1h',
  
  // Rate Limiting - DAHA SIKI!
  RATE_LIMIT: {
    MAX_REQUESTS: 30, // 50'den 30'a düşürdük (daha sıkı koruma)
    WINDOW_MS: 15 * 60 * 1000, // 15 dakika
    BAN_THRESHOLD: 10, // 10 başarısız deneme = ban
    BAN_DURATION: 60 * 60 * 1000, // 1 saat ban
  },
  
  // Session Settings
  SESSION_MAX_AGE: 60 * 60 * 1000, // 1 saat
  
  // Password Policy
  PASSWORD_POLICY: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL: true,
  }
};

// Şifre Hash'leme (bcrypt benzeri)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Şifre Doğrulama
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Input Sanitization - DAHA AGRESİF!
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // XSS koruması
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // iframe koruması
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // object koruması
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // embed koruması
    .replace(/javascript:/gi, '') // javascript: protokol koruması
    .replace(/data:text\/html/gi, '') // data URI koruması
    .replace(/vbscript:/gi, '') // vbscript koruması
    .replace(/on\w+\s*=/gi, '') // event handler koruması
    .replace(/[<>'"&]/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char] || char;
    })
    .trim();
}

// SQL Injection Koruması - DAHA SIKI!
export function validateSQLInput(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|TRUNCATE|GRANT|REVOKE)\b)/i,
    /(;|--|\/\*|\*\/|xp_|sp_)/i,
    /(char|nchar|varchar|nvarchar)\s*\(/i,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i, // OR 1=1, AND 1=1
    /(\bOR\b|\bAND\b)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?/i, // OR 'a'='a'
    /INFORMATION_SCHEMA/i,
    /pg_sleep|waitfor|benchmark/i, // Time-based injection
    /load_file|into\s+outfile/i, // File operations
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(input));
}

// Rate Limiting Store (basit in-memory) + BAN SİSTEMİ
const rateLimitStore = new Map<string, { count: number; resetTime: number; failedAttempts: number; bannedUntil?: number }>();

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  // Ban kontrolü
  if (record?.bannedUntil && now < record.bannedUntil) {
    logSecurityEvent('BANNED_IP_ATTEMPT', { ip: identifier, bannedUntil: new Date(record.bannedUntil) }, 'CRITICAL');
    return false;
  }
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
      failedAttempts: record?.failedAttempts || 0
    });
    return true;
  }
  
  if (record.count >= SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

// Başarısız giriş denemesi kaydet ve ban kontrolü
export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const record = rateLimitStore.get(identifier) || { count: 0, resetTime: now, failedAttempts: 0 };
  
  record.failedAttempts++;
  
  // Ban threshold'a ulaştı mı?
  if (record.failedAttempts >= SECURITY_CONFIG.RATE_LIMIT.BAN_THRESHOLD) {
    record.bannedUntil = now + SECURITY_CONFIG.RATE_LIMIT.BAN_DURATION;
    logSecurityEvent('IP_BANNED', { 
      ip: identifier, 
      failedAttempts: record.failedAttempts,
      bannedUntil: new Date(record.bannedUntil)
    }, 'CRITICAL');
  }
  
  rateLimitStore.set(identifier, record);
}

// Başarılı giriş sonrası failed attempts sıfırla
export function resetFailedAttempts(identifier: string): void {
  const record = rateLimitStore.get(identifier);
  if (record) {
    record.failedAttempts = 0;
    delete record.bannedUntil;
    rateLimitStore.set(identifier, record);
  }
}

// IP Adresi Alma
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIP) return cfConnectingIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  return 'unknown';
}

// Şüpheli User-Agent tespiti
export function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|php|java/i,
    /postman|insomnia|httpie/i,
    /scanner|exploit|hack|inject/i,
    /^.{0,10}$/, // Çok kısa user agent
    /^mozilla\/[0-9]\.[0-9]$/i, // Basit fake mozilla
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

// Güvenlik Logları - DAHA DETAYLI!
export function logSecurityEvent(event: string, details: Record<string, string | number | boolean>, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    severity,
    details: JSON.stringify(details)
  };
  
  console.log(`[SECURITY ${severity}] ${timestamp}: ${event}`, details);
  
  // Production'da bu loglar dosyaya veya log servisine gönderilmeli
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    // Kritik olaylar için alert sistemi
    console.error('🚨 CRITICAL SECURITY EVENT:', logEntry);
    
    // Burada email/Slack notification gönderilebilir
    // sendSecurityAlert(logEntry);
  }
}

// Honeypot alanları (bot tespiti için)
export function validateHoneypot(honeypotValue: string): boolean {
  // Honeypot alanı boş olmalı (botlar doldurur)
  return honeypotValue === '' || honeypotValue === undefined;
}

// Session Token Oluşturma
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// CSRF Token Oluşturma
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// CSRF Token Doğrulama
export function validateCSRFToken(requestToken: string, cookieToken: string): boolean {
  // Double submit cookie pattern: Token hem header'da hem cookie'de olmalı ve eşleşmeli
  if (!requestToken || !cookieToken) {
    return false;
  }
  
  // Timing-safe comparison (timing attack koruması)
  if (requestToken.length !== cookieToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < requestToken.length; i++) {
    result |= requestToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  
  return result === 0;
}

// CSRF Token Store (in-memory, production'da Redis kullanılmalı)
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

// CSRF Token Saklama ve Doğrulama
export function storeCSRFToken(sessionId: string, token: string, ttl: number = 3600000): void {
  csrfTokenStore.set(sessionId, {
    token,
    expiresAt: Date.now() + ttl, // 1 saat
  });
}

export function getCSRFToken(sessionId: string): string | null {
  const stored = csrfTokenStore.get(sessionId);
  if (!stored || Date.now() > stored.expiresAt) {
    csrfTokenStore.delete(sessionId);
    return null;
  }
  return stored.token;
}

export function removeCSRFToken(sessionId: string): void {
  csrfTokenStore.delete(sessionId);
}

// Eski token'ları temizle (her 5 dakikada bir çalıştırılmalı)
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [sessionId, stored] of csrfTokenStore.entries()) {
    if (now > stored.expiresAt) {
      csrfTokenStore.delete(sessionId);
    }
  }
}

// Güvenli rastgele şifre oluşturma
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
} 