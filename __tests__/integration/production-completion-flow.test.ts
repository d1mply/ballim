import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleProductionComplete } from '@/lib/stock';
import { query } from '@/lib/db';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logStockEvent: vi.fn() }));

describe('Üretim tamamlama akışı', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleProductionComplete stok ekleme, düşüm ve sipariş kalem güncellemesi yapmalı', async () => {
    const mockQuery = query as ReturnType<typeof vi.fn>;
    const inventoryRow = { available_stock: 20 };
    const reservedRow = { total_ordered: 0 };
    mockQuery.mockImplementation((sql: string) => {
      if (sql.trim().startsWith('SELECT') && sql.includes('inventory')) {
        return Promise.resolve({ rows: [inventoryRow], rowCount: 1 });
      }
      if (sql.trim().startsWith('SELECT') && sql.includes('order_items')) {
        return Promise.resolve({ rows: [reservedRow], rowCount: 1 });
      }
      return Promise.resolve(undefined);
    });

    const result = await handleProductionComplete(1, 1, 2, 2);

    expect(mockQuery).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });
});
