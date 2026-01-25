import { logSecurityEvent } from '../security';

// SQL Injection Pattern Detection
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|TRUNCATE|GRANT|REVOKE)\b)/i,
  /(;|--|\/\*|\*\/|xp_|sp_)/i,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i, // OR 1=1, AND 1=1
  /(\bOR\b|\bAND\b)\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?/i, // OR 'a'='a'
  /INFORMATION_SCHEMA/i,
  /pg_sleep|waitfor|benchmark/i,
  /load_file|into\s+outfile/i,
];

// Dynamic Query Detection
const DYNAMIC_QUERY_PATTERNS = [
  /\$\{[^}]+\}/, // Template literals
  /\+.*\+/, // String concatenation
  /`[^`]*\$\{[^}]+\}[^`]*`/, // Template strings
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate SQL query for injection attempts
 * 
 * @param text - SQL query text
 * @param params - Query parameters
 * @param isReadOnly - Whether query is read-only (SELECT)
 */
export function validateQuery(
  text: string,
  params?: (string | number | boolean | null)[],
  isReadOnly: boolean = false
): ValidationResult {
  // Security 1: Dynamic query pattern check (always active)
  if (DYNAMIC_QUERY_PATTERNS.some((pattern) => pattern.test(text))) {
    logSecurityEvent(
      'DYNAMIC_QUERY_DETECTED',
      {
        query: text.substring(0, 200),
        isReadOnly,
        timestamp: new Date().toISOString(),
      },
      'CRITICAL'
    );

    return {
      isValid: false,
      error:
        'Dynamic query kullanımı güvenlik nedeniyle engellenmiştir. Parametreli sorgu kullanın.',
    };
  }

  // Security 2: Lightweight validation for read-only (GET) requests
  if (isReadOnly) {
    if (params && params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        if (typeof param === 'string' && param.length > 0) {
          const criticalPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b.*\b(WHERE|FROM|INTO|TABLE)\b)/i,
            /(;|--|\/\*|\*\/)/, // SQL comment injection
            /(\bOR\b|\bAND\b)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/i, // OR 'a'='a'
          ];

          for (const pattern of criticalPatterns) {
            if (pattern.test(param)) {
              logSecurityEvent(
                'SQL_INJECTION_IN_PARAMS_READ',
                {
                  paramIndex: i,
                  paramValue: param.substring(0, 50),
                  pattern: pattern.toString(),
                  timestamp: new Date().toISOString(),
                },
                'CRITICAL'
              );

              return {
                isValid: false,
                error: `Parametre ${i + 1} içinde SQL injection pattern tespit edildi`,
              };
            }
          }
        }
      }
    }

    return { isValid: true };
  }

  // Security 3: Full validation for POST/PUT/DELETE
  if (!params || params.length === 0) {
    if (text.match(/\$[0-9]+/)) {
      return { isValid: false, error: 'Parametreli sorgu kullanılmalıdır' };
    }

    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        logSecurityEvent(
          'SQL_INJECTION_PATTERN_DETECTED',
          {
            query: text.substring(0, 200),
            pattern: pattern.toString(),
            timestamp: new Date().toISOString(),
          },
          'CRITICAL'
        );

        return { isValid: false, error: 'SQL injection pattern tespit edildi' };
      }
    }
  }

  // Security 4: Full parameter validation for mutations
  if (params && params.length > 0) {
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      if (typeof param === 'string' && param.length > 0) {
        for (const pattern of SQL_INJECTION_PATTERNS) {
          if (pattern.test(param)) {
            logSecurityEvent(
              'SQL_INJECTION_IN_PARAMS',
              {
                paramIndex: i,
                paramValue: param.substring(0, 100),
                pattern: pattern.toString(),
                timestamp: new Date().toISOString(),
              },
              'CRITICAL'
            );

            return {
              isValid: false,
              error: `Parametre ${i + 1} içinde SQL injection pattern tespit edildi`,
            };
          }
        }
      }
    }
  }

  return { isValid: true };
}
