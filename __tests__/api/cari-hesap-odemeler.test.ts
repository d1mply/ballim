import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  pool: {
    connect: vi.fn(() => Promise.resolve(mockClient)),
  },
}));

describe('API cari-hesap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          musteri_id: 1,
          musteri_adi: 'Test',
          tarih: '2024-01-01',
          aciklama: 'Ödeme',
          islem_turu: 'Alış',
          tutar: 100,
          odeme_yontemi: 'Nakit',
          siparis_id: null,
          bakiye: 100,
          created_at: '2024-01-01',
        },
      ],
      rowCount: 1,
    });
  });

  describe('GET /api/cari-hesap', () => {
    it('token yokken 401 döndürmeli', async () => {
      const { GET } = await import('@/app/api/cari-hesap/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/cari-hesap',
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('geçerli admin cookie ile liste döndürmeli', async () => {
      const { GET } = await import('@/app/api/cari-hesap/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/cari-hesap',
        cookies: { 'auth-token': JSON.stringify({ id: 1, type: 'admin' }) },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json[0]).toHaveProperty('musteri_id', 1);
    });

    it('customer kendi id si dışında customerId ile 403 döndürmeli', async () => {
      const { GET } = await import('@/app/api/cari-hesap/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/cari-hesap?customer_id=99',
        cookies: { 'auth-token': JSON.stringify({ id: 1, type: 'customer' }) },
      });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });
});

describe('API odemeler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          musteri_id: 1,
          musteri_adi: 'Test',
          siparis_id: null,
          odeme_tarihi: '2024-01-01',
          tutar: 50,
          odeme_yontemi: 'Nakit',
          vade_ay: null,
          durum: 'Tamamlandı',
          aciklama: null,
          created_at: '2024-01-01',
        },
      ],
      rowCount: 1,
    });
  });

  describe('GET /api/odemeler', () => {
    it('ödeme listesi 200 ve array döndürmeli', async () => {
      const { GET } = await import('@/app/api/odemeler/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/odemeler',
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json[0]).toHaveProperty('tutar', 50);
    });
  });
});

describe('API customer-payments/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockResolvedValue({
      rows: [
        { id: 1, odeme_tarihi: '2024-01-01', tutar: 100, odeme_yontemi: 'Havale', aciklama: null, durum: 'Tamamlandı' },
      ],
      rowCount: 1,
    });
  });

  it('ödeme listesi 200 ve array döndürmeli', async () => {
    const { GET } = await import('@/app/api/customer-payments/[id]/route');
    const req = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/customer-payments/1',
    });
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it('geçersiz id ile 400 döndürmeli', async () => {
    const { GET } = await import('@/app/api/customer-payments/[id]/route');
    const req = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/customer-payments/abc',
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });
});
