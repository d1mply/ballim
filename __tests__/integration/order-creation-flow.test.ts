import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orderQueries } from '@/lib/queries';
import { reserveOrderItems } from '@/lib/stock';
import { query } from '@/lib/db';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logStockEvent: vi.fn() }));

describe('Sipariş oluşturma akışı', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sipariş kodu ile sipariş bulunup stok rezervasyonu yapılabilmeli', async () => {
    const mockQuery = query as ReturnType<typeof vi.fn>;
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
      .mockResolvedValueOnce(undefined as never)
      .mockResolvedValueOnce({
        rows: [{ product_id: 1, quantity: 2 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [{ quantity: 10 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce(undefined as never)
      .mockResolvedValueOnce(undefined as never);

    const orderResult = await orderQueries.getById('SIP-1');
    expect(orderResult.rows).toHaveLength(1);
    expect(orderResult.rows[0].id).toBe(1);

    const reserveResult = await reserveOrderItems(1);
    expect(reserveResult.success).toBe(true);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('sipariş bulunamadığında getById boş döndürmeli', async () => {
    const mockQuery = query as ReturnType<typeof vi.fn>;
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const orderResult = await orderQueries.getById('UNKNOWN');
    expect(orderResult.rows).toHaveLength(0);
    expect(orderResult.rowCount).toBe(0);
  });
});
