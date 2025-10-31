import { NextRequest, NextResponse } from 'next/server';
import { 
  checkRateLimit, 
  sanitizeInput, 
  validateSQLInput, 
  getClientIP, 
  logSecurityEvent,
  recordFailedAttempt,
  resetFailedAttempts,
  isSuspiciousUserAgent,
  validateHoneypot,
  SECURITY_CONFIG
} from '../../../lib/security';
import bcrypt from 'bcrypt';
import { signJWT } from '@/lib/jwt';
import { logAuthEvent } from '@/lib/audit';

// Kullanıcı girişi
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const startTime = Date.now();
  
  // 🛡️ LAMER KONTROL 1: User-Agent kontrolü
  if (isSuspiciousUserAgent(userAgent)) {
    logSecurityEvent('SUSPICIOUS_USER_AGENT', { 
      ip: clientIP, 
      userAgent,
      blocked: true
    }, 'HIGH');
    
    return NextResponse.json({ 
      error: 'Erişim reddedildi' 
    }, { status: 403 });
  }
  
  // 🛡️ LAMER KONTROL 2: Rate limiting
  if (!checkRateLimit(clientIP)) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', { 
      ip: clientIP,
      userAgent,
      timestamp: new Date().toISOString()
    }, 'HIGH');
    
    return NextResponse.json({ 
      error: 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.' 
    }, { status: 429 });
  }
  
  try {
    const body = await request.json();
    const { username, password, type, honeypot } = body;
    
    // 🛡️ LAMER KONTROL 3: Honeypot kontrolü (bot tespiti)
    if (!validateHoneypot(honeypot)) {
      logSecurityEvent('HONEYPOT_TRIGGERED', { 
        ip: clientIP,
        userAgent,
        honeypot: honeypot
      }, 'CRITICAL');
      
      recordFailedAttempt(clientIP);
      return NextResponse.json({ 
        error: 'Geçersiz istek' 
      }, { status: 400 });
    }
    
    // 🛡️ LAMER KONTROL 4: Input validation
    if (!username || !password || !type) {
      logSecurityEvent('MISSING_CREDENTIALS', { 
        ip: clientIP,
        userAgent,
        missingFields: {
          username: !username,
          password: !password,
          type: !type
        }
      }, 'MEDIUM');
      
      recordFailedAttempt(clientIP);
      return NextResponse.json({ 
        error: 'Kullanıcı adı, şifre ve tip gerekli' 
      }, { status: 400 });
    }
    
    // 🛡️ LAMER KONTROL 5: Input sanitization
    const cleanUsername = sanitizeInput(username);
    const cleanPassword = sanitizeInput(password);
    const cleanType = sanitizeInput(type);
    
    // 🛡️ LAMER KONTROL 6: SQL injection kontrolü
    if (!validateSQLInput(cleanUsername) || !validateSQLInput(cleanPassword) || !validateSQLInput(cleanType)) {
      logSecurityEvent('SQL_INJECTION_ATTEMPT', { 
        ip: clientIP,
        userAgent,
        username: cleanUsername,
        type: cleanType,
        timestamp: new Date().toISOString()
      }, 'CRITICAL');
      
      recordFailedAttempt(clientIP);
      return NextResponse.json({ 
        error: 'Geçersiz karakterler tespit edildi' 
      }, { status: 400 });
    }
    
    // 🛡️ LAMER KONTROL 7: Tip kontrolü (sadece admin ve customer kabul et)
    if (cleanType !== 'admin' && cleanType !== 'customer') {
      logSecurityEvent('INVALID_USER_TYPE', { 
        ip: clientIP,
        userAgent,
        attemptedType: cleanType
      }, 'HIGH');
      
      recordFailedAttempt(clientIP);
      return NextResponse.json({ 
        error: 'Geçersiz kullanıcı tipi' 
      }, { status: 400 });
    }
    
    // 🛡️ LAMER KONTROL 8: Username uzunluk kontrolü
    if (cleanUsername.length > 50 || cleanPassword.length > 200) {
      logSecurityEvent('OVERSIZED_INPUT', { 
        ip: clientIP,
        userAgent,
        usernameLength: cleanUsername.length,
        passwordLength: cleanPassword.length
      }, 'HIGH');
      
      recordFailedAttempt(clientIP);
      return NextResponse.json({ 
        error: 'Girdi çok uzun' 
      }, { status: 400 });
    }
    
    let isValid = false;
    let userData = null;
    
    if (cleanType === 'admin') {
      // Admin giriş kontrolü
      isValid = cleanUsername === SECURITY_CONFIG.ADMIN_USERNAME && 
                cleanPassword === SECURITY_CONFIG.ADMIN_PASSWORD;
      
      if (isValid) {
        userData = {
          id: 'admin',
          username: SECURITY_CONFIG.ADMIN_USERNAME,
          type: 'admin'
        };
        
        // Başarılı admin girişi
        resetFailedAttempts(clientIP);
        logSecurityEvent('ADMIN_LOGIN_SUCCESS', { 
          ip: clientIP,
          userAgent,
          username: cleanUsername,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
        }, 'MEDIUM');
      } else {
        // Başarısız admin girişi - KRİTİK!
        recordFailedAttempt(clientIP);
        logSecurityEvent('ADMIN_LOGIN_FAILED', { 
          ip: clientIP,
          userAgent,
          attemptedUsername: cleanUsername,
          timestamp: new Date().toISOString()
        }, 'CRITICAL');
      }
    } else {
      // Customer giriş kontrolü (veritabanından)
      try {
        // Mevcut db.ts dosyasını kullan
        const { query } = await import('@/lib/db');
        
        // Parametreli sorgu (SQL injection koruması)
        const result = await query(`
          SELECT c.*, 
            (
              SELECT json_agg(json_build_object(
                'type', cfp.filament_type,
                'price', cfp.price_per_gram
              ))
              FROM customer_filament_prices cfp
              WHERE cfp.customer_id = c.id
            ) as filament_prices
          FROM customers c
          WHERE c.username = $1 AND c.password = $2
        `, [cleanUsername, cleanPassword]);
        
        if (result.rowCount > 0) {
          isValid = true;
          const customer = result.rows[0];
          userData = {
            id: customer.id,
            username: customer.username,
            name: customer.name,
            email: customer.email,
            type: 'customer',
            customerCategory: customer.customer_category || 'normal',
            discountRate: customer.discount_rate || 0,
            filamentPrices: customer.filament_prices || []
          };
          
          // Başarılı customer girişi
          resetFailedAttempts(clientIP);
          logSecurityEvent('CUSTOMER_LOGIN_SUCCESS', { 
            ip: clientIP,
            userAgent,
            customerId: userData.id,
            username: cleanUsername,
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime
          }, 'LOW');
        } else {
          // Başarısız customer girişi
          recordFailedAttempt(clientIP);
          logSecurityEvent('CUSTOMER_LOGIN_FAILED', { 
            ip: clientIP,
            userAgent,
            attemptedUsername: cleanUsername,
            timestamp: new Date().toISOString()
          }, 'MEDIUM');
        }
        
      } catch (error) {
        console.error('Database error:', error);
        logSecurityEvent('DATABASE_ERROR', { 
          ip: clientIP,
          userAgent,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }, 'HIGH');
        
        return NextResponse.json({ 
          error: 'Sunucu hatası' 
        }, { status: 500 });
      }
    }
    
    if (isValid && userData) {
      // Başarılı giriş → JWT üret ve HttpOnly cookie olarak ayarla
      const token = signJWT({
        sub: String(userData.id),
        username: userData.username,
        role: userData.type,
      }, Math.floor(SECURITY_CONFIG.SESSION_MAX_AGE / 1000));

      const response = NextResponse.json({ 
        success: true, 
        user: userData
      });

      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: Math.floor(SECURITY_CONFIG.SESSION_MAX_AGE / 1000),
        path: '/'
      });

      // Audit
      await logAuthEvent(String(userData.id), 'LOGIN_SUCCESS', clientIP, userAgent);
      return response;
    } else {
      // Başarısız giriş - generic error message (bilgi sızdırma önleme)
      await logAuthEvent(null, 'LOGIN_FAILED', clientIP, userAgent);
      return NextResponse.json({ 
        error: 'Kullanıcı adı veya şifre hatalı' 
      }, { status: 401 });
    }
    
  } catch (error) {
    // Beklenmeyen hata
    logSecurityEvent('UNEXPECTED_ERROR', { 
      ip: clientIP,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 'HIGH');
    
    recordFailedAttempt(clientIP);
    
    return NextResponse.json({ 
      error: 'Sunucu hatası' 
    }, { status: 500 });
  }
}

// Şifre hash'leme fonksiyonu
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
} 