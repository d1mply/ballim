import { sanitizeInput, validateSQLInput, logSecurityEvent, validateCSRFToken } from './security';

// Validation Error Class
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// API Validation Result Interface
export interface ValidationResult<T = Record<string, unknown>> {
  isValid: boolean;
  errors: string[];
  sanitizedData?: T;
}

// Input Validation Options
export interface ValidationOptions {
  sanitize?: boolean;
  validateSQL?: boolean;
  required?: string[];
  types?: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>;
  maxLengths?: Record<string, number>;
  minLengths?: Record<string, number>;
}

/**
 * API Input Validation Middleware
 * Tüm API endpoint'leri için ortak validation fonksiyonu
 */
export function validateAPIInput(
  data: Record<string, unknown>,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    sanitize = true,
    validateSQL = true,
    required = [],
    types = {},
    maxLengths = {},
    minLengths = {},
  } = options;

  const errors: string[] = [];
  const sanitizedData: Record<string, unknown> = {};

  try {
    // 1. Required field kontrolü
    for (const field of required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`${field} alanı zorunludur`);
      }
    }

    // 2. Her alan için validation
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) {
        continue;
      }

      // 3. Type kontrolü
      if (types[key]) {
        const expectedType = types[key];
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType !== expectedType) {
          errors.push(`${key} alanı ${expectedType} tipinde olmalı, ${actualType} tipinde`);
          continue;
        }
      }

      // 4. String validation
      if (typeof value === 'string') {
        // Sanitization
        if (sanitize) {
          sanitizedData[key] = sanitizeInput(value);
        } else {
          sanitizedData[key] = value;
        }

        // SQL Injection kontrolü
        if (validateSQL && !validateSQLInput(value)) {
          logSecurityEvent('SQL_INJECTION_ATTEMPT', {
            field: key,
            value: value.substring(0, 100), // İlk 100 karakteri logla
            timestamp: new Date().toISOString(),
          }, 'CRITICAL');
          errors.push(`${key} alanında geçersiz karakterler tespit edildi`);
          continue;
        }

        // Length kontrolleri
        if (minLengths[key] && value.length < minLengths[key]!) {
          errors.push(`${key} alanı en az ${minLengths[key]} karakter olmalı`);
        }
        if (maxLengths[key] && value.length > maxLengths[key]!) {
          errors.push(`${key} alanı en fazla ${maxLengths[key]} karakter olmalı`);
        }
      }
      // 5. Number validation
      else if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
          errors.push(`${key} alanı geçerli bir sayı olmalı`);
        } else {
          sanitizedData[key] = value;
        }
      }
      // 6. Boolean validation
      else if (typeof value === 'boolean') {
        sanitizedData[key] = value;
      }
      // 7. Array validation
      else if (Array.isArray(value)) {
        // Array içindeki her elemanı validate et
        const sanitizedArray: unknown[] = [];
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item === 'string') {
            if (sanitize) {
              const sanitized = sanitizeInput(item);
              if (validateSQL && !validateSQLInput(sanitized)) {
                logSecurityEvent('SQL_INJECTION_ATTEMPT', {
                  field: `${key}[${i}]`,
                  value: item.substring(0, 100),
                  timestamp: new Date().toISOString(),
                }, 'CRITICAL');
                errors.push(`${key}[${i}] alanında geçersiz karakterler tespit edildi`);
                continue;
              }
              sanitizedArray.push(sanitized);
            } else {
              sanitizedArray.push(item);
            }
          } else if (typeof item === 'object' && item !== null) {
            // Nested object validation (recursive)
            const nestedResult = validateAPIInput(item, { sanitize, validateSQL });
            if (!nestedResult.isValid) {
              errors.push(...nestedResult.errors.map(err => `${key}[${i}].${err}`));
            } else {
              sanitizedArray.push(nestedResult.sanitizedData);
            }
          } else {
            sanitizedArray.push(item);
          }
        }
        sanitizedData[key] = sanitizedArray;
      }
      // 8. Object validation (nested objects)
      else if (typeof value === 'object' && value !== null) {
        const nestedResult = validateAPIInput(value, { sanitize, validateSQL });
        if (!nestedResult.isValid) {
          errors.push(...nestedResult.errors.map(err => `${key}.${err}`));
        } else {
          sanitizedData[key] = nestedResult.sanitizedData;
        }
      }
      // 9. Diğer tipler
      else {
        sanitizedData[key] = value;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  } catch (error) {
    logSecurityEvent('VALIDATION_ERROR', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, 'HIGH');

    return {
      isValid: false,
      errors: ['Validation hatası oluştu'],
    };
  }
}

/**
 * CSRF Token Doğrulama
 */
export function validateCSRF(request: Request): { isValid: boolean; error?: string } {
  // GET ve HEAD istekleri için CSRF kontrolü gerekmez
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return { isValid: true };
  }

  // POST, PUT, DELETE için CSRF kontrolü
  const requestToken = request.headers.get('x-csrf-token') || '';
  const cookieToken = request.headers.get('cookie')?.split('csrf-token=')[1]?.split(';')[0] || '';

  if (!requestToken || !cookieToken) {
    logSecurityEvent('CSRF_TOKEN_MISSING', {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    }, 'HIGH');
    
    return { isValid: false, error: 'CSRF token eksik' };
  }

  if (!validateCSRFToken(requestToken, cookieToken)) {
    logSecurityEvent('CSRF_TOKEN_INVALID', {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    }, 'CRITICAL');
    
    return { isValid: false, error: 'Geçersiz CSRF token' };
  }

  return { isValid: true };
}

/**
 * API Route için Validation Wrapper
 * API handler fonksiyonunu wrap ederek otomatik validation yapar
 */
export function withValidation<T = Record<string, unknown>>(
  handler: (sanitizedData: T) => Promise<Response>,
  options: ValidationOptions & { requireCSRF?: boolean } = {}
) {
  return async (request: Request, data: Record<string, unknown>) => {
    // CSRF kontrolü (eğer gerekli ise)
    if (options.requireCSRF !== false) {
      const csrfCheck = validateCSRF(request);
      if (!csrfCheck.isValid) {
        return Response.json(
          {
            error: csrfCheck.error || 'CSRF validation hatası',
          },
          { status: 403 }
        );
      }
    }

    const validation = validateAPIInput(data, options);

    if (!validation.isValid) {
      return Response.json(
        {
          error: 'Validation hatası',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    return handler(validation.sanitizedData as T);
  };
}

/**
 * Özel validation fonksiyonları
 */

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation (Türkiye telefon formatı)
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// URL validation
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Positive number validation
export function validatePositiveNumber(value: number): boolean {
  return typeof value === 'number' && value >= 0 && isFinite(value);
}

// ID validation (positive integer)
export function validateID(id: unknown): boolean {
  const num = typeof id === 'string' ? parseInt(id, 10) : id;
  return Number.isInteger(num) && num > 0;
}

// Product code validation (alfanümerik, tire, alt çizgi)
export function validateProductCode(code: string): boolean {
  const codeRegex = /^[A-Za-z0-9_-]+$/;
  return codeRegex.test(code) && code.length >= 3 && code.length <= 50;
}
