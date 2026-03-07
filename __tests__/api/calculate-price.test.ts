import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

vi.mock('@/lib/pricing', () => ({
  calculateOrderItemPrice: vi.fn(),
  getWholesalePriceDetails: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ query: vi.fn() }));

describe('API calculate-price', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const pricing = await import('@/lib/pricing');
    vi.mocked(pricing.calculateOrderItemPrice).mockResolvedValue(100);
    vi.mocked(pricing.getWholesalePriceDetails).mockResolvedValue({
      unitPrice: 90,
      totalPrice: 180,
      priceRange: '100-500',
      discountRate: 10,
    });
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockResolvedValue({
      rows: [{ customer_category: 'normal', discount_rate: 0 }],
      rowCount: 1,
    });
  });

  it('productId veya quantity eksikse 400 döndürmeli', async () => {
    const { POST } = await import('@/app/api/calculate-price/route');
    const req = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/calculate-price',
      body: { productId: '1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await getResponseJson(res as import('next/server').NextResponse);
    expect(json.error).toContain('Ürün ID ve miktar');
  });

  it('customerId yoksa pazaryeri yanıtı döndürmeli', async () => {
    const { POST } = await import('@/app/api/calculate-price/route');
    const req = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/calculate-price',
      body: { productId: '1', quantity: 5 },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await getResponseJson(res as import('next/server').NextResponse);
    expect(json).toMatchObject({
      unitPrice: 0.01,
      totalPrice: 0.01,
      customerType: 'marketplace',
    });
  });

  it('geçerli customerId ile fiyat detayı döndürmeli', async () => {
    const { POST } = await import('@/app/api/calculate-price/route');
    const req = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/calculate-price',
      body: { customerId: 1, productId: '1', quantity: 2, filamentType: 'PLA' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await getResponseJson(res as import('next/server').NextResponse);
    expect(json).toHaveProperty('unitPrice', 100);
    expect(json).toHaveProperty('totalPrice');
    expect(json.customerType).toBe('normal');
  });

  it('müşteri bulunamadığında 404 döndürmeli', async () => {
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const { POST } = await import('@/app/api/calculate-price/route');
    const req = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/calculate-price',
      body: { customerId: 999, productId: '1', quantity: 1 },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await getResponseJson(res as import('next/server').NextResponse);
    expect(json.error).toContain('Müşteri bulunamadı');
  });
});
