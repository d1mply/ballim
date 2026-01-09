import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, storeCSRFToken } from '../../../lib/security';
import { verifyJWT } from '../../../lib/jwt';

// CSRF Token Getirme Endpoint
export async function GET(request: NextRequest) {
  try {
    // Kullanıcı kimlik doğrulaması
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const verify = verifyJWT(token);
    if (!verify.valid || !verify.payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Session ID oluştur (user ID + random salt)
    const sessionId = `csrf-${verify.payload.sub}-${Date.now()}`;
    
    // CSRF token oluştur
    const csrfToken = generateCSRFToken();
    
    // Token'ı sakla
    storeCSRFToken(sessionId, csrfToken, 3600000); // 1 saat

    const response = NextResponse.json({
      csrfToken,
      sessionId,
    });

    // Double submit cookie pattern: Token hem response'da hem cookie'de
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 saat
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('CSRF token oluşturma hatası:', error);
    return NextResponse.json(
      { error: 'CSRF token oluşturulamadı' },
      { status: 500 }
    );
  }
}
