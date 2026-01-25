import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  filamentQueries,
  orderQueries,
  productQueries,
  inventoryQueries,
  filamentUsageQueries,
} from '@/lib/queries';
import { query } from '@/lib/db';

// Mock database module
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('queries.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // filamentQueries Tests
  // ============================================
  describe('filamentQueries', () => {
    describe('getAll', () => {
      it('tüm filamentleri döndürmeli', async () => {
        const mockFilaments = {
          rows: [
            { id: 1, name: 'PLA Red', type: 'PLA', color: 'Red' },
            { id: 2, name: 'PETG Blue', type: 'PETG', color: 'Blue' },
          ],
          rowCount: 2,
        };
        mockQuery.mockResolvedValueOnce(mockFilaments);

        const result = await filamentQueries.getAll();

        expect(result.rows).toHaveLength(2);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT')
        );
      });

      it('boş sonuç döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await filamentQueries.getAll();

        expect(result.rows).toHaveLength(0);
      });

      it('sadece remaining_weight > 0 olanları getirmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await filamentQueries.getAll();

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('remaining_weight > 0')
        );
      });
    });

    describe('getByTypeAndColor', () => {
      it('tip ve renge göre filament getirmeli', async () => {
        const mockResult = {
          rows: [{ id: 1, filament_code: 'PLA-RED-001', remaining_weight: 500 }],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await filamentQueries.getByTypeAndColor('PLA', 'Red');

        expect(result.rows).toHaveLength(1);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('type = $1 AND color = $2'),
          ['PLA', 'Red']
        );
      });

      it('bulunamadığında boş sonuç döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await filamentQueries.getByTypeAndColor('UNKNOWN', 'Color');

        expect(result.rows).toHaveLength(0);
      });

      it('remaining_weight DESC sıralamalı', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await filamentQueries.getByTypeAndColor('PLA', 'Red');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY remaining_weight DESC'),
          expect.any(Array)
        );
      });
    });

    describe('updateWeight', () => {
      it('ağırlık güncellemeli ve sonuç döndürmeli', async () => {
        const mockResult = {
          rows: [{ id: 1, filament_code: 'PLA-001', remaining_weight: 450 }],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await filamentQueries.updateWeight(1, 450);

        expect(result.rows[0].remaining_weight).toBe(450);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE filaments'),
          [450, 1]
        );
      });

      it('RETURNING clause içermeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await filamentQueries.updateWeight(1, 100);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('RETURNING'),
          expect.any(Array)
        );
      });
    });
  });

  // ============================================
  // orderQueries Tests
  // ============================================
  describe('orderQueries', () => {
    describe('getById', () => {
      it('order_code ile sipariş getirmeli', async () => {
        const mockResult = {
          rows: [{ id: 123 }],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await orderQueries.getById('SIP-2024-001');

        expect(result.rows[0].id).toBe(123);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('order_code = $1'),
          ['SIP-2024-001']
        );
      });

      it('bulunamadığında boş sonuç döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await orderQueries.getById('INVALID');

        expect(result.rows).toHaveLength(0);
      });

      it('LIMIT 1 içermeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await orderQueries.getById('TEST');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT 1'),
          expect.any(Array)
        );
      });
    });

    describe('getForProduction', () => {
      it('üretim siparişlerini getirmeli', async () => {
        const mockResult = {
          rows: [
            { id: 1, order_code: 'SIP-001', status: 'Üretimde' },
          ],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await orderQueries.getForProduction();

        expect(result.rows).toHaveLength(1);
      });

      it('sadece belirli status değerlerini getirmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await orderQueries.getForProduction();

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('Onay Bekliyor')
        );
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('Üretimde')
        );
      });

      it('LIMIT 50 içermeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await orderQueries.getForProduction();

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT 50')
        );
      });

      it('created_at DESC sıralamalı', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await orderQueries.getForProduction();

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY o.created_at DESC')
        );
      });
    });
  });

  // ============================================
  // productQueries Tests
  // ============================================
  describe('productQueries', () => {
    describe('getFilaments', () => {
      it('ürün filament bilgilerini getirmeli', async () => {
        const mockResult = {
          rows: [
            { filament_type: 'PLA', filament_color: 'Red', weight: 10, brand: 'Esun' },
          ],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await productQueries.getFilaments('123');

        expect(result.rows[0].filament_type).toBe('PLA');
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('product_filaments'),
          ['123']
        );
      });

      it('filament yoksa boş döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const result = await productQueries.getFilaments('999');

        expect(result.rows).toHaveLength(0);
      });
    });

    describe('getStockStatus', () => {
      it('stok durumunu getirmeli', async () => {
        const mockResult = {
          rows: [{ available_stock: 50, reserved_stock: 10 }],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await productQueries.getStockStatus('123');

        expect(result.rows[0].available_stock).toBe(50);
        expect(result.rows[0].reserved_stock).toBe(10);
      });

      it('stok yoksa COALESCE 0 döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await productQueries.getStockStatus('999');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('COALESCE'),
          expect.any(Array)
        );
      });
    });
  });

  // ============================================
  // inventoryQueries Tests
  // ============================================
  describe('inventoryQueries', () => {
    describe('updateStock', () => {
      it('stok ekleme yapmalı', async () => {
        const mockResult = {
          rows: [{ quantity: 60 }],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await inventoryQueries.updateStock('123', 10);

        expect(result.rows[0].quantity).toBe(60);
      });

      it('ON CONFLICT ile upsert yapmalı', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await inventoryQueries.updateStock('123', 10);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('ON CONFLICT'),
          expect.any(Array)
        );
      });

      it('negatif değer ile stok çıkarma yapabilmeli', async () => {
        const mockResult = {
          rows: [{ quantity: 40 }],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await inventoryQueries.updateStock('123', -10);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          ['123', -10]
        );
      });

      it('RETURNING quantity içermeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await inventoryQueries.updateStock('123', 5);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('RETURNING quantity'),
          expect.any(Array)
        );
      });
    });

    describe('checkStock', () => {
      it('mevcut stok miktarını döndürmeli', async () => {
        const mockResult = {
          rows: [{ current_stock: 100 }],
          rowCount: 1,
        };
        mockQuery.mockResolvedValueOnce(mockResult);

        const result = await inventoryQueries.checkStock('123');

        expect(result.rows[0].current_stock).toBe(100);
      });

      it('stok yoksa COALESCE 0 döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await inventoryQueries.checkStock('999');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('COALESCE(quantity, 0)'),
          expect.any(Array)
        );
      });
    });
  });

  // ============================================
  // filamentUsageQueries Tests
  // ============================================
  describe('filamentUsageQueries', () => {
    describe('logUsage', () => {
      it('filament kullanımı kaydetmeli', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });

        await filamentUsageQueries.logUsage(1, '123', 'SIP-001', 15.5, 'Üretim');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO filament_usage'),
          [1, '123', 'SIP-001', 15.5, 'Üretim']
        );
      });

      it('doğru parametrelerle çağrılmalı', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });

        await filamentUsageQueries.logUsage(5, 'PROD-1', 'ORD-1', 20, 'Test');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          [5, 'PROD-1', 'ORD-1', 20, 'Test']
        );
      });

      it('CURRENT_DATE kullanmalı', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });

        await filamentUsageQueries.logUsage(1, '1', '1', 10, 'test');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('CURRENT_DATE'),
          expect.any(Array)
        );
      });
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('database hatası fırlatılmalı', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(filamentQueries.getAll()).rejects.toThrow('Connection refused');
    });

    it('tüm query fonksiyonları async olmalı', () => {
      expect(filamentQueries.getAll).toBeInstanceOf(Function);
      expect(orderQueries.getById).toBeInstanceOf(Function);
      expect(productQueries.getFilaments).toBeInstanceOf(Function);
      expect(inventoryQueries.updateStock).toBeInstanceOf(Function);
      expect(filamentUsageQueries.logUsage).toBeInstanceOf(Function);
    });
  });
});
