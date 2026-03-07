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
import { query } from '../../../lib/db';

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
    // NOT: Şifre sanitize edilmez çünkü bcrypt ile hash'lenecek ve özel karakterler içerebilir
    const cleanUsername = sanitizeInput(username);
    const cleanPassword = password; // Şifre sanitize edilmez (bcrypt ile güvenli)
    const cleanType = sanitizeInput(type);
    
    // 🛡️ LAMER KONTROL 6: SQL injection kontrolü
    // NOT: Şifre kontrol edilmez çünkü direkt query'de kullanılmayacak (bcrypt ile kontrol edilecek)
    if (!validateSQLInput(cleanUsername) || !validateSQLInput(cleanType)) {
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
      // 1) Try users table (RBAC)
      try {
        const userResult = await query(
          `SELECT u.*, r.name as role_name, r.permissions
           FROM users u LEFT JOIN roles r ON u.role_id = r.id
           WHERE u.username = $1 AND u.is_active = true`,
          [cleanUsername]
        );

        if (userResult.rows.length > 0) {
          const dbUser = userResult.rows[0];
          let passwordValid = false;
          if (dbUser.password_hash.startsWith('$2')) {
            passwordValid = await bcrypt.compare(cleanPassword, dbUser.password_hash);
          }
          if (passwordValid) {
            isValid = true;
            const perms = dbUser.permissions || [];
            userData = {
              id: dbUser.id,
              username: dbUser.username,
              name: dbUser.name,
              type: 'admin',
              role: dbUser.role_name || 'admin',
              permissions: typeof perms === 'string' ? JSON.parse(perms) : perms,
            };
            resetFailedAttempts(clientIP);
            logSecurityEvent('USER_LOGIN_SUCCESS', { ip: clientIP, userAgent, username: cleanUsername, role: dbUser.role_name || 'admin', timestamp: new Date().toISOString(), responseTime: Date.now() - startTime }, 'MEDIUM');
          }
        }
      } catch (dbErr) {
        console.warn('Users table lookup failed (falling back to env admin):', dbErr instanceof Error ? dbErr.message : dbErr);
      }

      // 2) Fallback: env-based admin
      if (!isValid) {
        isValid = cleanUsername === SECURITY_CONFIG.ADMIN_USERNAME && cleanPassword === SECURITY_CONFIG.ADMIN_PASSWORD;
        if (isValid) {
          userData = { id: 'admin', username: SECURITY_CONFIG.ADMIN_USERNAME, type: 'admin', role: 'super_admin', permissions: ['*'] };
          resetFailedAttempts(clientIP);
          logSecurityEvent('ADMIN_LOGIN_SUCCESS', { ip: clientIP, userAgent, username: cleanUsername, timestamp: new Date().toISOString(), responseTime: Date.now() - startTime }, 'MEDIUM');
        } else {
          recordFailedAttempt(clientIP);
          logSecurityEvent('ADMIN_LOGIN_FAILED', { ip: clientIP, userAgent, attemptedUsername: cleanUsername, timestamp: new Date().toISOString() }, 'CRITICAL');
        }
      }
    } else {
      // Customer giriş kontrolü (veritabanından)
      try {
        // Mevcut db.ts dosyasını kullan
        const { query } = await import('@/lib/db');
        
        console.log('Login denemesi - Username:', cleanUsername);
        
        // Önce kullanıcıyı bul (şifre olmadan - güvenlik için)
        // Basitleştirilmiş query (subquery validation sorununu önlemek için)
        const result = await query(`
          SELECT c.*
          FROM customers c
          WHERE c.username = $1
        `, [cleanUsername]);
        
        console.log('Query sonucu:', result.rowCount, 'satır bulundu');
        
        if (result.rowCount > 0) {
          const customer = result.rows[0];
          console.log('Kullanıcı bulundu, şifre doğrulaması yapılıyor...');
          
          // Şifre doğrulama: bcrypt ile hash'lenmiş şifreyi kontrol et
          // Eğer veritabanındaki şifre hash'lenmişse bcrypt.compare kullan, değilse direkt karşılaştır
          let passwordValid = false;
          
          try {
            if (customer.password) {
              // Şifre bcrypt hash formatında mı kontrol et ($2a$, $2b$, $2y$ ile başlıyor mu)
              if (customer.password.startsWith('$2')) {
                // Bcrypt hash'li şifre - bcrypt.compare ile kontrol et
                passwordValid = await bcrypt.compare(cleanPassword, customer.password);
                console.log('Bcrypt karşılaştırma sonucu:', passwordValid);
              } else {
                // Plaintext şifre (eski sistem uyumluluğu için) - direkt karşılaştır
                passwordValid = customer.password === cleanPassword;
                console.log('Plaintext karşılaştırma sonucu:', passwordValid);
              }
            } else {
              console.log('Kullanıcının şifresi yok');
            }
          } catch (bcryptError) {
            console.error('Bcrypt hatası:', bcryptError);
            passwordValid = false;
          }
          
          if (passwordValid) {
            isValid = true;
            
            // Filament prices'ı ayrı query ile al (subquery sorununu önlemek için)
            let filamentPrices = [];
            try {
              const filamentResult = await query(`
                SELECT filament_type as type, price_per_gram as price
                FROM customer_filament_prices
                WHERE customer_id = $1
              `, [customer.id]);
              filamentPrices = filamentResult.rows || [];
            } catch (filamentError) {
              console.error('Filament prices çekme hatası (devam ediliyor):', filamentError);
            }
            
            userData = {
              id: customer.id,
              username: customer.username,
              name: customer.name,
              email: customer.email,
              type: 'customer',
              customerCategory: customer.customer_category || 'normal',
              discountRate: customer.discount_rate || 0,
              filamentPrices: filamentPrices
            };
            
            console.log('Login başarılı:', userData.username);
            
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
            console.log('Şifre yanlış');
            // Başarısız customer girişi (şifre yanlış)
            recordFailedAttempt(clientIP);
            logSecurityEvent('CUSTOMER_LOGIN_FAILED', { 
              ip: clientIP,
              userAgent,
              attemptedUsername: cleanUsername,
              timestamp: new Date().toISOString()
            }, 'MEDIUM');
          }
        } else {
          console.log('Kullanıcı bulunamadı');
          // Kullanıcı bulunamadı
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
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        });
        
        logSecurityEvent('DATABASE_ERROR', { 
          ip: clientIP,
          userAgent,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        }, 'HIGH');
        
        return NextResponse.json({ 
          error: 'Sunucu hatası',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error') : undefined
        }, { status: 500 });
      }
    }
    
    if (isValid && userData) {
      // Bakım modu kontrolü - sadece customer'lar için
      if (userData.type === 'customer') {
        try {
          const settingsCheck = await query(`
            SELECT setting_value 
            FROM system_settings 
            WHERE setting_key = 'maintenance_mode'
          `);
          
          if (settingsCheck.rows.length > 0) {
            const maintenanceMode = settingsCheck.rows[0].setting_value === true || settingsCheck.rows[0].setting_value === 'true';
            if (maintenanceMode) {
              await logAuthEvent(String(userData.id), 'LOGIN_BLOCKED_MAINTENANCE', clientIP, userAgent);
              return NextResponse.json({ 
                error: 'Bakım modu aktif. Lütfen daha sonra tekrar deneyin.' 
              }, { status: 503 });
            }
          }
        } catch (settingsError) {
          // Settings kontrolü hatası - girişe izin ver (fail-open)
          console.warn('Bakım modu kontrolü başarısız, girişe izin veriliyor:', settingsError);
        }
      }
      
      const token = signJWT({
        sub: String(userData.id),
        username: userData.username,
        role: userData.type,
        ...(userData.type === 'customer' ? { customerId: userData.id } : {}),
        ...(userData.role ? { rbacRole: userData.role } : {}),
        ...(userData.permissions ? { permissions: userData.permissions } : {}),
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

      // Audit (hata olsa bile devam et)
      try {
        await logAuthEvent(String(userData.id), 'LOGIN_SUCCESS', clientIP, userAgent);
      } catch (auditError) {
        console.error('Audit log hatası (devam ediliyor):', auditError);
      }
      
      return response;
    } else {
      // Başarısız giriş - generic error message (bilgi sızdırma önleme)
      try {
        await logAuthEvent(null, 'LOGIN_FAILED', clientIP, userAgent);
      } catch (auditError) {
        console.error('Audit log hatası (devam ediliyor):', auditError);
      }
      
      return NextResponse.json({ 
        error: 'Kullanıcı adı veya şifre hatalı' 
      }, { status: 401 });
    }
    
  } catch (error) {
    // Beklenmeyen hata
    console.error('Login genel hatası:', error);
    logSecurityEvent('UNEXPECTED_ERROR', { 
      ip: clientIP,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, 'HIGH');
    
    recordFailedAttempt(clientIP);
    
    return NextResponse.json({ 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}

// Şifre hash'leme fonksiyonu
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
} 