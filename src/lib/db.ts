import { Pool } from 'pg';
import { logSecurityEvent } from './security';
import { createTables as runCreateTables } from './db/create-tables';

// SQL Injection Pattern Detection (only for user-supplied parameters, not query text)
const SQL_INJECTION_PATTERNS_FOR_PARAMS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|TRUNCATE|GRANT|REVOKE)\b)/i,
  /(;|--|\/\*|\*\/|xp_|sp_)/i,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
  /(\bOR\b|\bAND\b)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?/i,
  /INFORMATION_SCHEMA/i,
  /pg_sleep|waitfor|benchmark/i,
  /load_file|into\s+outfile/i,
];

// Patterns for detecting dangerous combinations in query text itself
const SQL_INJECTION_PATTERNS_FOR_QUERY = [
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
  /(\bOR\b|\bAND\b)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?/i,
  /INFORMATION_SCHEMA/i,
  /pg_sleep|waitfor|benchmark/i,
  /load_file|into\s+outfile/i,
];

// Base64 resim verisi kontrolÃ¼ â€” SQL injection taramasÄ±ndan muaf tutulur
function isBase64Image(value: string): boolean {
  return /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/.test(value);
}

// Dynamic Query Detection
const DYNAMIC_QUERY_PATTERNS = [
  /\$\{[^}]+\}/, // Template literals
  /\+.*\+/, // String concatenation
  /`[^`]*\$\{[^}]+\}[^`]*`/, // Template strings
];

// VeritabanÄ± baÄŸlantÄ± bilgileri
export const pool = new Pool(
  // Render'da DATABASE_URL varsa onu kullan, yoksa individual env variables kullan
  // DATABASE_URL'in direkt kullanÄ±lmasÄ±nÄ± saÄŸlÄ±yorum, fazladan SSL parametresi eklenmesini engelliyorum.
  // process.env.DATABASE_URL.includes('?') ? '&sslmode=require' : '?sslmode=require'
  process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  } : {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    // Local development'ta SSL false, aksi halde SSL aktif
    ssl: process.env.NODE_ENV === 'development' ? false : {
      rejectUnauthorized: false
    },
    // Connection pool optimization
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  }
);

// Connection test fonksiyonu
export async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('VeritabanÄ± baÄŸlantÄ±sÄ± baÅŸarÄ±lÄ±');
    return true;
  } catch (error) {
    console.error('VeritabanÄ± baÄŸlantÄ± hatasÄ±:', error);
    return false;
  }
}

// SQL Injection ve Dynamic Query KontrolÃ¼
// PERFORMANS: GET request'lerde hafifletilmiÅŸ validation (sadece kritik kontroller)
export function validateQuery(text: string, params?: (string | number | boolean | null)[], isReadOnly: boolean = false): { isValid: boolean; error?: string } {
  // ğŸ›¡ï¸ GÃ¼venlik 1: Dynamic query pattern kontrolÃ¼ (her zaman aktif)
  if (DYNAMIC_QUERY_PATTERNS.some(pattern => pattern.test(text))) {
    logSecurityEvent('DYNAMIC_QUERY_DETECTED', {
      query: text.substring(0, 200),
      isReadOnly,
      timestamp: new Date().toISOString(),
    }, 'CRITICAL');
    
    return { isValid: false, error: 'Dynamic query kullanÄ±mÄ± gÃ¼venlik nedeniyle engellenmiÅŸtir. Parametreli sorgu kullanÄ±n.' };
  }

  // ğŸ›¡ï¸ GÃ¼venlik 2: GET request'lerde (read-only) hafifletilmiÅŸ validation
  if (isReadOnly) {
    // Sadece kritik kontroller:
    // - Dynamic query kontrolÃ¼ (yukarÄ±da yapÄ±ldÄ±)
    // - Parametrelerde SQL injection kontrolÃ¼ (sadece string parametrelerde)
    if (params && params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        // Sadece string parametrelerde kontrol et (number, boolean gÃ¼venli)
        if (typeof param === 'string' && param.length > 0 && !isBase64Image(param)) {
          // Kritik SQL injection pattern'leri (sadece en tehlikeli olanlar)
          const criticalPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b.*\b(WHERE|FROM|INTO|TABLE)\b)/i,
            /(;|--|\/\*|\*\/)/, // SQL comment injection
            /(\bOR\b|\bAND\b)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/i, // OR 'a'='a'
          ];
          
          for (const pattern of criticalPatterns) {
            if (pattern.test(param)) {
              logSecurityEvent('SQL_INJECTION_IN_PARAMS_READ', {
                paramIndex: i,
                paramValue: param.substring(0, 50),
                pattern: pattern.toString(),
                timestamp: new Date().toISOString(),
              }, 'CRITICAL');
              
              return { isValid: false, error: `Parametre ${i + 1} iÃ§inde SQL injection pattern tespit edildi` };
            }
          }
        }
      }
    }
    
    return { isValid: true };
  }

  // ğŸ›¡ï¸ GÃ¼venlik 3: POST/PUT/DELETE iÃ§in tam validation
  // Parametreli sorgu kontrolÃ¼
  if (!params || params.length === 0) {
    if (text.match(/\$[0-9]+/)) {
      return { isValid: false, error: 'Parametreli sorgu kullanÄ±lmalÄ±dÄ±r' };
    }
    
    // Query text'te sadece tehlikeli kombinasyonlarÄ± kontrol et
    // (SELECT, CREATE gibi keyword'ler SQL sorgularÄ±nda doÄŸal olarak bulunur)
    for (const pattern of SQL_INJECTION_PATTERNS_FOR_QUERY) {
      if (pattern.test(text)) {
        logSecurityEvent('SQL_INJECTION_PATTERN_DETECTED', {
          query: text.substring(0, 200),
          pattern: pattern.toString(),
          timestamp: new Date().toISOString(),
        }, 'CRITICAL');
        
        return { isValid: false, error: 'SQL injection pattern tespit edildi' };
      }
    }
  }

  // ğŸ›¡ï¸ GÃ¼venlik 4: Parametrelerde SQL injection kontrolÃ¼ (tam kontrol)
  if (params && params.length > 0) {
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      if (typeof param === 'string' && param.length > 0 && !isBase64Image(param)) {
        for (const pattern of SQL_INJECTION_PATTERNS_FOR_PARAMS) {
          if (pattern.test(param)) {
            logSecurityEvent('SQL_INJECTION_IN_PARAMS', {
              paramIndex: i,
              paramValue: param.substring(0, 100),
              pattern: pattern.toString(),
              timestamp: new Date().toISOString(),
            }, 'CRITICAL');
            
            return { isValid: false, error: `Parametre ${i + 1} iÃ§inde SQL injection pattern tespit edildi` };
          }
        }
      }
    }
  }

  return { isValid: true };
}

// Sorgu Ã§alÄ±ÅŸtÄ±rma yardÄ±mcÄ± fonksiyonu - GÃ¼venlik GeliÅŸtirmeleri + Performans Optimizasyonu
export async function query(text: string, params?: (string | number | boolean | null)[]) {
  const start = Date.now();
  
  try {
    // ğŸš€ PERFORMANS: GET request'lerde (SELECT) hafifletilmiÅŸ validation
    // POST/PUT/DELETE iÃ§in tam validation
    const isReadOnly = text.trim().toUpperCase().startsWith('SELECT') || 
                      text.trim().toUpperCase().startsWith('WITH');
    
    // ğŸ›¡ï¸ GÃ¼venlik: Query validation (isReadOnly'ye gÃ¶re)
    const validation = validateQuery(text, params, isReadOnly);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Query validation failed');
    }

    // Production'da log seviyesini azalt
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sorgu baÅŸlatÄ±lÄ±yor:', { text, params });
      console.log('VeritabanÄ± bilgileri:', {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        hasDatabase_URL: !!process.env.DATABASE_URL
      });
    }
    
    // Parametreli sorgu ile Ã§alÄ±ÅŸtÄ±r (pg otomatik olarak prepared statement kullanÄ±r)
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sorgu Ã§alÄ±ÅŸtÄ±rÄ±ldÄ±', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Sorgu hatasÄ±:', {
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      query: text.substring(0, 200), // Ä°lk 200 karakteri logla
      params: params ? params.map(p => typeof p === 'string' ? p.substring(0, 50) : p) : undefined,
      timestamp: new Date().toISOString()
    });
    
    // GÃ¼venlik hatalarÄ±nÄ± ayrÄ± logla
    if (error instanceof Error && error.message.includes('validation')) {
      logSecurityEvent('QUERY_VALIDATION_FAILED', {
        query: text.substring(0, 200),
        error: error.message,
        timestamp: new Date().toISOString(),
      }, 'CRITICAL');
    }
    
    throw error;
  }
}

// Veritabanı şemalarını oluşturma
export async function createTables() {
  return runCreateTables(query);
}

// TablolarÄ± sadece bir kez oluÅŸtur - development modunda
if (process.env.NODE_ENV === 'development') {
  createTables()
    .then(() => {
      console.log('Tablolar baÅŸarÄ±yla oluÅŸturuldu veya zaten mevcuttu');
    })
    .catch(console.error);
}

// db objesi - eski kodlar iÃ§in uyumluluk
export const db = {
  query
}; 
