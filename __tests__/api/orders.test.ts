import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(),
  getUserFromRequest: vi.fn().mockResolvedValue({ userId: 'test', role: 'admin' }),
}));

describe('API orders', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ cnt: '5' }], rowCount: 1 })
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
            products: [],
          },
        ],
        rowCount: 1,
      });
  });

  describe('GET /api/orders', () => {
    it('sipariş listesi 200 ve data/meta döndürmeli', async () => {
      const { GET } = await import('@/app/api/orders/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/orders',
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toHaveProperty('data');
      expect(json).toHaveProperty('meta');
      expect(json.meta).toMatchObject({ page: 1, totalCount: 5 });
    });

    it('customerId ve sayfalama parametreleri ile sorgulanmalı', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.query).mockReset();
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ cnt: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              order_code: 'SIP-2',
              customer_id: 10,
              status: 'Onay Bekliyor',
              total_amount: 50,
              order_date: new Date(),
              customer_name: 'Müşteri',
              products: [],
            },
          ],
          rowCount: 1,
        });
      const { GET } = await import('@/app/api/orders/route');
      const req = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/orders?customerId=10&page=2&limit=5',
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json.meta.page).toBe(2);
    });
  });

  describe('POST /api/orders', () => {
    it('ürünler eksikse 400 döndürmeli', async () => {
      const { POST } = await import('@/app/api/orders/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/orders',
        body: { customerId: 1 },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json.error).toContain('Ürünler');
    });

    it('ürünler boş dizi ise 400 döndürmeli', async () => {
      const { POST } = await import('@/app/api/orders/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/orders',
        body: { products: [] },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('geçerli products ile sipariş oluşturup 200 döndürmeli', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.query).mockReset();
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [{ order_number: 100 }], rowCount: 1 })
        .mockResolvedValueOnce(undefined as never)
        .mockResolvedValueOnce({
          rows: [{ id: 1, order_code: 'SIP-100', customer_id: null, total_amount: 0 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ product_code: 'P1', product_type: 'Figür' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce(undefined as never)
        .mockResolvedValueOnce(undefined as never)
        .mockResolvedValueOnce(undefined as never)
        .mockResolvedValueOnce(undefined as never);
      const { POST } = await import('@/app/api/orders/route');
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/orders',
        body: {
          products: [{ productId: '1', quantity: 2, unitPrice: 25 }],
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json.success).toBe(true);
      expect(json.order).toBeDefined();
    });
  });
});
