import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(),
  getUserFromRequest: vi.fn().mockResolvedValue({ userId: 'test', role: 'admin' }),
}));
vi.mock('@/lib/security', () => ({ getClientIP: vi.fn(() => '127.0.0.1'), logSecurityEvent: vi.fn() }));

const mockProductRow = {
  id: '1',
  product_code: 'PRD-001',
  product_type: 'Figür',
  image_path: null,
  barcode: null,
  capacity: 10,
  dimension_x: 10,
  dimension_y: 10,
  dimension_z: 10,
  print_time: 60,
  total_gram: 100,
  piece_gram: 10,
  file_path: null,
  notes: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  filaments: [],
  inventory_quantity: 5,
  total_ordered: 0,
};

describe('API products', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockResolvedValue({
      rows: [mockProductRow],
      rowCount: 1,
    });
  });

  describe('GET /api/products', () => {
    it('ürün listesi 200 ve array döndürmeli', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockProductRow],
        rowCount: 1,
      });
      const { GET } = await import('@/app/api/products/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json[0]).toHaveProperty('code', 'PRD-001');
      expect(json[0]).toHaveProperty('productType', 'Figür');
    });
  });

  describe('GET /api/products/[id]', () => {
    it('geçerli id ile 200 ve ürün döndürmeli', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          {
            ...mockProductRow,
            available_stock: 5,
            reserved_stock: 0,
          },
        ],
        rowCount: 1,
      });
      const { GET } = await import('@/app/api/products/[id]/route');
      const req = createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/products/1' });
      const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(200);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toHaveProperty('id', '1');
      expect(json).toHaveProperty('code', 'PRD-001');
    });

    it('kayıt yoksa 404 döndürmeli', async () => {
      const db = await import('@/lib/db');
      vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const { GET } = await import('@/app/api/products/[id]/route');
      const req = createMockRequest({ method: 'GET', url: 'http://localhost:3000/api/products/999' });
      const res = await GET(req, { params: Promise.resolve({ id: '999' }) });
      expect(res.status).toBe(404);
      const json = await getResponseJson(res as import('next/server').NextResponse);
      expect(json).toHaveProperty('error');
    });
  });

});
