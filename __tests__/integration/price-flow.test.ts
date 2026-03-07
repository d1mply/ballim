import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateNormalCustomerPrice,
  calculateOrderItemPrice,
  getWholesalePriceDetails,
} from '@/lib/pricing';
import type { Product, FilamentPrice } from '@/lib/pricing';
import { query } from '@/lib/db';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));

const mockProduct: Product = {
  id: 1,
  capacity: 10,
  piece_gram: 15,
};

const mockFilamentPrices: FilamentPrice[] = [
  { type: 'PLA', price: 5 },
  { type: 'PETG', price: 7 },
];

describe('Fiyat hesaplama akışı', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockQuery = query as ReturnType<typeof vi.fn>;
    mockQuery.mockResolvedValue({
      rows: [{ customer_category: 'normal', discount_rate: 0 }],
      rowCount: 1,
    });
  });

  it('normal müşteri fiyatı piece_gram * quantity * filament fiyatı olmalı', async () => {
    const total = await calculateNormalCustomerPrice(
      mockProduct,
      10,
      mockFilamentPrices,
      'PLA'
    );
    expect(total).toBe(15 * 10 * 5);
  });

  it('calculateOrderItemPrice müşteri ve ürün ile birim fiyat döndürmeli', async () => {
    const mockQuery = query as ReturnType<typeof vi.fn>;
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ piece_gram: 15, capacity: 10 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ price: 5 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ customer_category: 'normal' }],
        rowCount: 1,
      });
    const price = await calculateOrderItemPrice(1, 1, 2, 'PLA');
    expect(typeof price).toBe('number');
    expect(price).toBeGreaterThanOrEqual(0);
  });

  it('toptan fiyat detayı getWholesalePriceDetails ile alınabilmeli', async () => {
    const mockQuery = query as ReturnType<typeof vi.fn>;
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ capacity: 10, piece_gram: 15 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ discount_rate: 10 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ min_gram: 0, max_gram: 100, price: 5 }],
        rowCount: 1,
      });
    const details = await getWholesalePriceDetails(1, 1, 2);
    expect(details).toHaveProperty('priceRange');
    expect(details).toHaveProperty('discountRate');
    expect(details).toHaveProperty('finalPrice');
    expect(details).toHaveProperty('totalGrams');
  });
});
