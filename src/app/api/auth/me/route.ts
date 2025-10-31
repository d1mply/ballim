import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const { valid, payload, error } = verifyJWT(token);
  if (!valid) {
    return NextResponse.json({ authenticated: false, error }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: payload });
}


