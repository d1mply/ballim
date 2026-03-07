import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));

describe('API dashboard-stats', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockResolvedValue({
      rows: [
        {
          total_products: 10,
          total_orders: 50,
          pending_orders: 5,
          completed_orders: 40,
          total_revenue: 10000,
          today_orders: 2,
          today_revenue: 200,
          monthly_revenue: 3000,
          active_customers: 15,
          total_customers: 20,
          today_new_customers: 1,
          critical_stock: 2,
        },
      ],
      rowCount: 1,
    });
  });

  describe('GET /api/dashboard-stats', () => {
    it('istatistikler 200 ve stats objesi döndürmeli', async () => {
      const { GET } = await import('@/app/api/dashboard-stats/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty('totalProducts', 10);
      expect(json).toHaveProperty('totalOrders', 50);
      expect(json).toHaveProperty('totalCustomers', 20);
      expect(json).toHaveProperty('totalRevenue', 10000);
      expect(json).toHaveProperty('pendingOrders');
      expect(json).toHaveProperty('criticalStock');
    });
  });
});

describe('API customer-stats/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query)
      .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ total: '500' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ count: '4' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ balance: '100' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 });
  });

  it('müşteri istatistikleri 200 döndürmeli', async () => {
    const { GET } = await import('@/app/api/customer-stats/[id]/route');
    const req = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/customer-stats/1',
    });
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const json = await getResponseJson(res as import('next/server').NextResponse);
    expect(json).toMatchObject({
      totalOrders: 5,
      totalSpent: 500,
      pendingOrders: 1,
      completedOrders: 4,
      currentBalance: 100,
      favoriteProducts: 3,
    });
  });

  it('geçersiz id ile 400 döndürmeli', async () => {
    const { GET } = await import('@/app/api/customer-stats/[id]/route');
    const req = createMockRequest({
      method: 'GET',
      url: 'http://localhost:3000/api/customer-stats/abc',
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });
});
