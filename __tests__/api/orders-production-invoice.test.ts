import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/cache', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));
vi.mock('@/lib/stock', () => ({ handleOrderStock: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(),
  getUserFromRequest: vi.fn().mockResolvedValue({ userId: 'test', role: 'admin' }),
}));

describe('API orders/production', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const cache = await import('@/lib/cache');
    vi.mocked(cache.cacheGet).mockReturnValue(undefined);
    const db = await import('@/lib/db');
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ cnt: '3' }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            order_code: 'SIP-1',
            customer_id: 1,
            status: 'Onay Bekliyor',
            total_amount: 100,
            order_date: new Date(),
            customer_name: 'Test',
            notes: '',
            products: [],
          },
        ],
        rowCount: 1,
      });
  });

  describe('GET /api/orders/production', () => {
    it('üretim sipariş listesi 200 ve data döndürmeli', async () => {
      const { GET } = await import('@/app/api/orders/production/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/orders/production',
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty('data');
      expect(json).toHaveProperty('meta');
    });
  });
});

describe('API orders/[id]/invoice', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            order_code: 'SIP-1',
            customer_name: 'Test',
            customer_phone: '',
            customer_address: '',
            customer_email: '',
            order_date: new Date(),
            total_amount: 100,
            status: 'Onay Bekliyor',
            notes: '',
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            product_code: 'P1',
            product_name: 'Ürün 1',
            quantity: 2,
            unit_price: 50,
            total_price: 100,
            capacity: 5,
            piece_gram: 10,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ balance: 0 }],
        rowCount: 1,
      });
  });

  it('sipariş kodu ile fatura 200 döndürmeli', async () => {
    const { GET } = await import('@/app/api/orders/[id]/invoice/route');
    const req = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/orders/SIP-1/invoice',
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'SIP-1' }) });
    expect(res.status).toBe(200);
    const json = await getResponseJson(res as import('next/server').NextResponse);
    expect(json).toHaveProperty('order');
    expect(json).toHaveProperty('items');
  });

  it('sipariş bulunamadığında 404 döndürmeli', async () => {
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockReset();
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const { GET } = await import('@/app/api/orders/[id]/invoice/route');
    const req = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/orders/UNKNOWN/invoice',
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'UNKNOWN' }) });
    expect(res.status).toBe(404);
  });
});

describe('API orders/status', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('orderId ve status ile PUT 200 döndürmeli', async () => {
    const db = await import('@/lib/db');
    const orderRow = {
      id: 1,
      order_code: '1',
      status: 'Onay Bekliyor',
      production_quantity: 0,
      skip_production: false,
    };
    vi.mocked(db.query).mockImplementation((sql: string) => {
      if (sql.includes('information_schema') && sql.includes('column_name')) {
        return Promise.resolve({ rows: [{ column_name: 'x' }], rowCount: 1 });
      }
      if (sql.includes('SELECT') && sql.includes('order_code') && sql.includes('LIMIT 1')) {
        return Promise.resolve({ rows: [orderRow], rowCount: 1 });
      }
      if (sql.includes('UPDATE orders') && sql.includes('RETURNING')) {
        return Promise.resolve({ rows: [orderRow], rowCount: 1 });
      }
      return Promise.resolve(undefined as never);
    });
    const { PUT } = await import('@/app/api/orders/status/route');
    const req = createMockRequest({
      method: 'PUT',
      url: 'http://localhost:3000/api/orders/status',
      body: { orderId: 1, status: 'Üretimde' },
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });
});
