import crypto from 'crypto';
import { SECURITY_CONFIG } from './security';

function base64url(input: Buffer | string): string {
  return (input instanceof Buffer ? input : Buffer.from(input))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signJWT(payload: Record<string, unknown>, expiresInSeconds = 60 * 60): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSeconds, ...payload };
  const headerPart = base64url(JSON.stringify(header));
  const payloadPart = base64url(JSON.stringify(body));
  const data = `${headerPart}.${payloadPart}`;
  const signature = crypto
    .createHmac('sha256', SECURITY_CONFIG.JWT_SECRET)
    .update(data)
    .digest();
  const signaturePart = base64url(signature);
  return `${data}.${signaturePart}`;
}

export function verifyJWT(token: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return { valid: false, error: 'Malformed token' };
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = base64url(
      crypto.createHmac('sha256', SECURITY_CONFIG.JWT_SECRET).update(data).digest()
    );
    if (expectedSig !== sigB64) return { valid: false, error: 'Invalid signature' };
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && now > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}


