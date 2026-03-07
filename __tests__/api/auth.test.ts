import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

const mockQuery = vi.fn();
const mockSignJWT = vi.fn();
const mockVerifyJWT = vi.fn();
const mockLogAuthEvent = vi.fn();
const mockLogSecurityEvent = vi.fn();

vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/jwt', () => ({
  signJWT: vi.fn(),
  verifyJWT: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ logAuthEvent: vi.fn() }));
vi.mock('@/lib/security', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIP: vi.fn(() => '127.0.0.1'),
  validateHoneypot: vi.fn((v: string) => v === '' || v === undefined),
  isSuspiciousUserAgent: vi.fn(() => false),
  sanitizeInput: vi.fn((x: string) => x),
  validateSQLInput: vi.fn(() => true),
  logSecurityEvent: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetFailedAttempts: vi.fn(),
  SECURITY_CONFIG: {
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'Admin123123123.',
    SESSION_MAX_AGE: 3600000,
  },
}));

describe('API auth', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    const jwt = await import('@/lib/jwt');
    const audit = await import('@/lib/audit');
    const security = await import('@/lib/security');
    vi.mocked(db.query).mockImplementation(mockQuery);
    vi.mocked(jwt.signJWT).mockImplementation(mockSignJWT as never);
    vi.mocked(jwt.verifyJWT).mockImplementation(mockVerifyJWT as never);
    vi.mocked(audit.logAuthEvent).mockImplementation(mockLogAuthEvent as never);
    vi.mocked(security.checkRateLimit).mockReturnValue(true);
    vi.mocked(security.validateHoneypot).mockImplementation((v: string) => v === '' || v === undefined);
    vi.mocked(security.isSuspiciousUserAgent).mockReturnValue(false);
    mockSignJWT.mockReturnValue('mock-jwt-token');
  });

  describe('POST /api/auth', () => {
    it('geçerli admin bilgileri ile 200 ve success döndürmeli', async () => {
      const { POST } = await import('@/app/api/auth/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth',
        body: {
          username: 'admin',
          password: 'Admin123123123.',
          type: 'admin',
          honeypot: '',
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toMatchObject({ success: true, user: { id: 'admin', type: 'admin' } });
      expect(mockSignJWT).toHaveBeenCalled();
    });

    it('eksik username/password/type ile 400 döndürmeli', async () => {
      const { POST } = await import('@/app/api/auth/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth',
        body: { username: 'admin', honeypot: '' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toHaveProperty('error');
    });

    it('honeypot dolu ise 400 döndürmeli', async () => {
      const security = await import('@/lib/security');
      vi.mocked(security.validateHoneypot).mockReturnValue(false);
      const { POST } = await import('@/app/api/auth/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth',
        body: {
          username: 'admin',
          password: 'Admin123123123.',
          type: 'admin',
          honeypot: 'bot-filled',
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rate limit aşıldığında 429 döndürmeli', async () => {
      const security = await import('@/lib/security');
      vi.mocked(security.checkRateLimit).mockReturnValue(false);
      const { POST } = await import('@/app/api/auth/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth',
        body: {
          username: 'admin',
          password: 'Admin123123123.',
          type: 'admin',
          honeypot: '',
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it('şüpheli user-agent ile 403 döndürmeli', async () => {
      const security = await import('@/lib/security');
      vi.mocked(security.isSuspiciousUserAgent).mockReturnValue(true);
      const { POST } = await import('@/app/api/auth/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth',
        body: {
          username: 'admin',
          password: 'Admin123123123.',
          type: 'admin',
          honeypot: '',
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('yanlış admin şifresi ile 401 döndürmeli', async () => {
      const { POST } = await import('@/app/api/auth/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth',
        body: {
          username: 'admin',
          password: 'WrongPassword',
          type: 'admin',
          honeypot: '',
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('geçerli token ile 200 ve user döndürmeli', async () => {
      mockVerifyJWT.mockReturnValue({
        valid: true,
        payload: { sub: '1', role: 'admin' },
      });
      const { GET } = await import('@/app/api/auth/me/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/auth/me',
        cookies: { 'auth-token': 'valid-token' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toMatchObject({ authenticated: true, user: { sub: '1', role: 'admin' } });
    });

    it('token yokken 401 döndürmeli', async () => {
      const { GET } = await import('@/app/api/auth/me/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/auth/me',
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toMatchObject({ authenticated: false });
    });

    it('geçersiz token ile 401 döndürmeli', async () => {
      mockVerifyJWT.mockReturnValue({ valid: false });
      const { GET } = await import('@/app/api/auth/me/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/auth/me',
        cookies: { 'auth-token': 'invalid' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('her zaman 200 ve success döndürmeli', async () => {
      const { POST } = await import('@/app/api/auth/logout/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/logout',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toMatchObject({ success: true });
    });
  });
});
