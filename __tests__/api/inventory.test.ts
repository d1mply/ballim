import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));

describe('API inventory', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockResolvedValue({
      rows: [
        {
          product_id: 1,
          product_code: 'P1',
          product_type: 'Figür',
          quantity: 10,
          required_quantity: 0,
          stock_status: 'Stokta Var',
          updated_at: '2024-01-01',
        },
      ],
      rowCount: 1,
    });
  });

  describe('GET /api/inventory', () => {
    it('stok listesi 200 ve array döndürmeli', async () => {
      const { GET } = await import('@/app/api/inventory/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json[0]).toHaveProperty('productId', 1);
      expect(json[0]).toHaveProperty('productCode', 'P1');
      expect(json[0]).toHaveProperty('stockStatus', 'Stokta Var');
    });
  });

  describe('PUT /api/inventory', () => {
    it('productId eksikse 400 döndürmeli', async () => {
      const { PUT } = await import('@/app/api/inventory/route');
      const req = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/inventory',
        body: { quantity: 5, operation: 'add' },
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json.error).toContain('Ürün ID');
    });

    it('geçerli body ile 200 döndürmeli', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.query)
        .mockResolvedValueOnce(undefined as never)
        .mockResolvedValueOnce({
          rows: [{ product_id: 1, quantity: 10, product_code: 'P1', product_type: 'Figür' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ quantity: 15 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce(undefined as never);
      const { PUT } = await import('@/app/api/inventory/route');
      const req = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/inventory',
        body: { productId: 1, quantity: 5, operation: 'add' },
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });
  });
});
