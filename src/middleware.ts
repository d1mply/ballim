import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 🛡️ LAMER KORUMA SİSTEMİ - DAHA AGRESİF!
// NOT: JWT authentication API route'larında yapılıyor (Edge Runtime crypto desteklemiyor)
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Güvenlik başlıkları - Sahibinden.com gibi güvenlik standartları
  const securityHeaders = {
    // Content Security Policy - Güvenlik odaklı, sıkı CSP
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // PDF için gerekli
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Google Fonts CSS
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com", // Google Fonts dosyaları
      "connect-src 'self'", // API istekleri sadece kendi domain'den
      "media-src 'none'",
      "object-src 'none'", // Plugin'ler engellenmiş
      "base-uri 'self'",
      "form-action 'self'", // Form submission sadece kendi domain'e
      "frame-ancestors 'none'", // Clickjacking koruması - hiçbir frame içine alınamaz
      "frame-src 'none'", // Frame embedding engellenmiş
      "upgrade-insecure-requests", // HTTP -> HTTPS yönlendirme
      "block-all-mixed-content" // Mixed content engellenmiş
    ].join('; '),
    
    // HSTS - HTTP Strict Transport Security (1 yıl)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Clickjacking koruması - EN STRICT
    'X-Frame-Options': 'DENY',
    
    // MIME type sniffing koruması
    'X-Content-Type-Options': 'nosniff',
    
    // XSS koruması (legacy browser support)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy - Hassas bilgi sızıntısını önle
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy - Gereksiz özellikleri engelle
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'bluetooth=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'autoplay=()',
      'encrypted-media=()',
      'picture-in-picture=()'
    ].join(', '),
    
    // DNS prefetch kontrolü - Güvenlik için kapalı
    'X-DNS-Prefetch-Control': 'off',
    
    // Download options - Dosya indirme güvenliği
    'X-Download-Options': 'noopen',
    
    // Cross-Origin Resource Policy - CORP
    'Cross-Origin-Resource-Policy': 'same-origin',
    
    // Cross-Origin Embedder Policy - COEP
    'Cross-Origin-Embedder-Policy': 'require-corp',
    
    // Cross-Origin Opener Policy - COOP
    'Cross-Origin-Opener-Policy': 'same-origin',
    
    // Powered by gizleme - Bilgi sızıntısını önle
    'X-Powered-By': ''
  };
  
  // Güvenlik başlıklarını ekle
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  const url = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const clientIP = getClientIP(request);
  
  // 🚫 LAMER KONTROL 1: Şüpheli User-Agent
  const suspiciousUserAgents = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|php|java|go-http|libwww/i,
    /postman|insomnia|httpie|burp|sqlmap|nikto|nmap/i,
    /scanner|exploit|hack|inject|attack|vulnerability/i,
    /^.{0,15}$/, // Çok kısa user agent (15 karakterden az)
    /^mozilla\/[0-9]\.[0-9]$/i, // Basit fake mozilla
    /^user-agent$/i, // Literal "user-agent"
    /test|example|sample/i,
    /headless|phantom|selenium|chromedriver/i,
    /masscan|zmap|nuclei|gobuster|ffuf/i
  ];
  
  if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
    console.log(`🚫 LAMER BLOCKED: ${clientIP} - Suspicious User-Agent: ${userAgent}`);
    return new NextResponse('Access Denied', { status: 403 });
  }
  
  // 🚫 LAMER KONTROL 2: Çok kısa User-Agent (sadece çok kısa olanları engelle)
  if (userAgent.length < 10) {
    console.log(`🚫 LAMER BLOCKED: ${clientIP} - Too short User-Agent: ${userAgent}`);
    return new NextResponse('Access Denied', { status: 403 });
  }
  
  // 🚫 LAMER KONTROL 3: Şüpheli path'ler
  const suspiciousPaths = [
    // Admin panel denemeleri (sadece bilinen kötü path'ler)
    /\/wp-admin|\/phpmyadmin|\/cpanel|\/administrator$/i,
    // Config dosyaları
    /\.env|\.config|\.ini|\.conf|\.yaml|\.yml|\.json$/i,
    // Backup dosyaları
    /\.bak|\.backup|\.old|\.orig|\.save|\.tmp$/i,
    // Script dosyaları
    /\.php|\.asp|\.aspx|\.jsp|\.cgi|\.pl$/i,
    // Path traversal
    /\.\.|\/\.\.|\\\.\.|\%2e\%2e|\%2f\%2e\%2e/i,
    // SQL injection patterns
    /union|select|insert|update|delete|drop|create|alter|exec/i,
    // XSS patterns
    /<script|javascript:|vbscript:|onload|onerror|onclick/i,
    // Common exploit paths
    /\/etc\/passwd|\/proc\/|\/var\/log|\/windows\/system32/i,
    // Wordpress specific
    /wp-content|wp-includes|wp-json|xmlrpc\.php/i,
    // Shell attempts
    /\/bin\/|\/usr\/bin\/|cmd\.exe|powershell/i
  ];
  
  if (suspiciousPaths.some(pattern => pattern.test(url.pathname))) {
    console.log(`🚫 LAMER BLOCKED: ${clientIP} - Suspicious path: ${url.pathname}`);
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // 🚫 LAMER KONTROL 4: Şüpheli query parametreleri
  const suspiciousQueries = [
    /union|select|insert|update|delete|drop|create|alter|exec/i,
    /<script|javascript:|vbscript:|onload|onerror/i,
    /\.\.|\/\.\.|\\\.\.|\%2e\%2e/i,
    /\/etc\/passwd|\/proc\/|\/var\/log/i,
    /cmd\.exe|powershell|\/bin\//i
  ];
  
  const queryString = url.search;
  if (queryString && suspiciousQueries.some(pattern => pattern.test(queryString))) {
    console.log(`🚫 LAMER BLOCKED: ${clientIP} - Suspicious query: ${queryString}`);
    return new NextResponse('Bad Request', { status: 400 });
  }
  
  // 🚫 LAMER KONTROL 5: HTTP Method kontrolü
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];
  if (!allowedMethods.includes(request.method)) {
    console.log(`🚫 LAMER BLOCKED: ${clientIP} - Invalid method: ${request.method}`);
    return new NextResponse('Method Not Allowed', { status: 405 });
  }
  
  // 🚫 LAMER KONTROL 6: Referer kontrolü (sadece API endpoint'leri için)
  // Geçici olarak devre dışı bırakıldı
  /*
  if (url.pathname.startsWith('/api/')) {
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // POST, PUT, DELETE için referer/origin kontrolü
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      const validOrigins = [
        `https://${host}`,
        `http://${host}`,
        `http://localhost:3000`,
        `https://localhost:3000`
      ];
      
      if (!origin && !referer) {
        console.log(`🚫 LAMER BLOCKED: ${clientIP} - No origin/referer for ${request.method} ${url.pathname}`);
        return new NextResponse('Forbidden', { status: 403 });
      }
      
      if (origin && !validOrigins.some(valid => origin.startsWith(valid))) {
        console.log(`🚫 LAMER BLOCKED: ${clientIP} - Invalid origin: ${origin}`);
        return new NextResponse('Forbidden', { status: 403 });
      }
    }
  }
  */
  
  // 🚫 LAMER KONTROL 7: Content-Length kontrolü (çok büyük request'ler)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    console.log(`🚫 LAMER BLOCKED: ${clientIP} - Too large request: ${contentLength} bytes`);
    return new NextResponse('Request Too Large', { status: 413 });
  }
  
  // 🔐 API Authentication & Authorization
  // JWT authentication API route'larında yapılıyor (Edge Runtime crypto desteklemiyor)
  // Her API route kendi içinde auth kontrolü yapıyor
  
  // Dashboard sayfaları için JWT kontrolü YOK - localStorage kontrolü frontend'de yapılıyor
  
  // 🚫 LAMER KONTROL 9: Rate limiting header'ları ekle
  response.headers.set('X-RateLimit-Limit', '50');
  response.headers.set('X-RateLimit-Window', '15min');
  
  // Başarılı request loglama (sadece önemli endpoint'ler için)
  if (url.pathname.startsWith('/api/auth') || url.pathname.includes('admin') || url.pathname === '/urunler') {
    console.log(`✅ ALLOWED: ${clientIP} - ${request.method} ${url.pathname} - UA: ${userAgent.substring(0, 50)}...`);
  }
  
  return response;
}

// IP adresi alma fonksiyonu
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  return 'unknown';
}

// Middleware'in çalışacağı path'ler
export const config = {
  matcher: [
    /*
     * Tüm request path'leri için çalış, ancak şunları hariç tut:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 