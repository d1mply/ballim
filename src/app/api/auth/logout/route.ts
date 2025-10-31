import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { logAuthEvent } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const decoded = token ? verifyJWT(token) : { valid: false };
  const userId = decoded.valid ? String(decoded.payload?.sub || '') : null;

  const response = NextResponse.json({ success: true });
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  await logAuthEvent(userId, 'LOGOUT');
  return response;
}


