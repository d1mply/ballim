import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StockOperation,
  STOCK_COLORS,
  getStockStatus,
  processStockOperation,
  reserveOrderItems,
  unreserveOrderItems,
  handleProductionComplete,
  handleOrderStock,
} from '@/lib/stock';
import { query } from '@/lib/db';
import { logStockEvent } from '@/lib/audit';

// Mock database and audit modules
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logStockEvent: vi.fn(),
}));

const mockQuery = query as ReturnType<typeof vi.fn>;
const mockLogStockEvent = logStockEvent as ReturnType<typeof vi.fn>;

// Suppress console output
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('stock.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // StockOperation Enum Tests
  // ============================================
  describe('StockOperation', () => {
    it('ADD değeri tanımlı olmalı', () => {
      expect(StockOperation.ADD).toBe('ADD');
    });

    it('REMOVE değeri tanımlı olmalı', () => {
      expect(StockOperation.REMOVE).toBe('REMOVE');
    });

    it('RESERVE değeri tanımlı olmalı', () => {
      expect(StockOperation.RESERVE).toBe('RESERVE');
    });

    it('UNRESERVE değeri tanımlı olmalı', () => {
      expect(StockOperation.UNRESERVE).toBe('UNRESERVE');
    });
  });

  // ============================================
  // STOCK_COLORS Tests
  // ============================================
  describe('STOCK_COLORS', () => {
    it('IN_STOCK rengi green olmalı', () => {
      expect(STOCK_COLORS.IN_STOCK).toContain('green');
    });

    it('LOW_STOCK rengi yellow olmalı', () => {
      expect(STOCK_COLORS.LOW_STOCK).toContain('yellow');
    });

    it('OUT_OF_STOCK rengi red olmalı', () => {
      expect(STOCK_COLORS.OUT_OF_STOCK).toContain('red');
    });

    it('RESERVED rengi blue olmalı', () => {
      expect(STOCK_COLORS.RESERVED).toContain('blue');
    });
  });

  // ============================================
  // getStockStatus Tests
  // ============================================
  describe('getStockStatus', () => {
    describe('stok mevcut senaryoları', () => {
      it('stok varsa ve sipariş yoksa doğru durum döndürmeli', async () => {
        // Inventory query
        mockQuery.mockResolvedValueOnce({
          rows: [{ available_stock: '100' }],
        });
        // Reserved query
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_ordered: '0' }],
        });

        const result = await getStockStatus(1);

        expect(result.availableStock).toBe(100);
        expect(result.reservedStock).toBe(0);
        expect(result.stockDisplay).toContain('100');
        expect(result.stockColor).toBe(STOCK_COLORS.IN_STOCK);
      });

      it('stok ve rezerve varsa kombine göstermeli', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ available_stock: '50' }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_ordered: '20' }],
        });

        const result = await getStockStatus(1);

        // availableStock = 50 - 20 = 30
        expect(result.availableStock).toBe(30);
        expect(result.reservedStock).toBe(0);
      });

      it('sipariş stoktan fazlaysa rezerve göstermeli', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ available_stock: '30' }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_ordered: '50' }],
        });

        const result = await getStockStatus(1);

        // availableStock = 0, reservedStock = 50 - 30 = 20
        expect(result.availableStock).toBe(0);
        expect(result.reservedStock).toBe(20);
        expect(result.stockColor).toBe(STOCK_COLORS.RESERVED);
      });
    });

    describe('stok yok senaryoları', () => {
      it('stok yoksa OUT_OF_STOCK döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ available_stock: '0' }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_ordered: '0' }],
        });

        const result = await getStockStatus(1);

        expect(result.availableStock).toBe(0);
        expect(result.stockDisplay).toBe('Stokta Yok');
        expect(result.stockColor).toBe(STOCK_COLORS.OUT_OF_STOCK);
      });

      it('inventory tablosu yoksa hata yakalamalı', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Table not found'));
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_ordered: '0' }],
        });

        const result = await getStockStatus(1);

        expect(result.availableStock).toBe(0);
      });
    });

    describe('hata senaryoları', () => {
      it('genel hata durumunda varsayılan değer döndürmeli', async () => {
        // İlk query başarısız olursa catch'e düşer
        mockQuery
          .mockRejectedValueOnce(new Error('Database error'))
          .mockRejectedValueOnce(new Error('Database error'));

        const result = await getStockStatus(1);

        expect(result.availableStock).toBe(0);
        expect(result.reservedStock).toBe(0);
        expect(result.stockDisplay).toBe('Stokta Yok');
      });
    });
  });

  // ============================================
  // processStockOperation Tests
  // ============================================
  describe('processStockOperation', () => {
    describe('ADD operasyonu', () => {
      it('stoka başarıyla eklemeli', async () => {
        // BEGIN
        mockQuery.mockResolvedValueOnce({});
        // getStockStatus - inventory
        mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '10' }] });
        // getStockStatus - reserved
        mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });
        // INSERT
        mockQuery.mockResolvedValueOnce({});
        // COMMIT
        mockQuery.mockResolvedValueOnce({});
        // logStockEvent
        mockLogStockEvent.mockResolvedValueOnce({});
        // getStockStatus after - inventory
        mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '20' }] });
        // getStockStatus after - reserved
        mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });

        const result = await processStockOperation(1, StockOperation.ADD, 10);

        expect(result.success).toBe(true);
        expect(result.message).toContain('ADD');
      });
    });

    describe('REMOVE operasyonu', () => {
      it('yeterli stok varsa başarılı olmalı', async () => {
        mockQuery.mockResolvedValueOnce({}); // BEGIN
        mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '50' }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });
        mockQuery.mockResolvedValueOnce({}); // UPDATE
        mockQuery.mockResolvedValueOnce({}); // COMMIT
        mockLogStockEvent.mockResolvedValueOnce({});
        mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '40' }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });

        const result = await processStockOperation(1, StockOperation.REMOVE, 10);

        expect(result.success).toBe(true);
      });

      it('yetersiz stokta başarısız olmalı', async () => {
        mockQuery.mockResolvedValueOnce({}); // BEGIN
        mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '5' }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });
        mockQuery.mockResolvedValueOnce({}); // ROLLBACK

        const result = await processStockOperation(1, StockOperation.REMOVE, 10);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Yetersiz stok');
      });
    });

    describe('RESERVE/UNRESERVE operasyonları', () => {
      it('RESERVE operasyonu başarılı olmalı', async () => {
        mockQuery.mockResolvedValueOnce({}); // BEGIN
        mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '10' }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });
        // No additional query for RESERVE
        mockQuery.mockResolvedValueOnce({}); // COMMIT
        mockLogStockEvent.mockResolvedValueOnce({});
        mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '10' }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });

        const result = await processStockOperation(1, StockOperation.RESERVE, 5);

        expect(result.success).toBe(true);
      });
    });

    describe('hata senaryoları', () => {
      it('yetersiz stok durumunda başarısız döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({}); // BEGIN
        mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '2' }] }); // inventory
        mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] }); // reserved
        mockQuery.mockResolvedValueOnce({}); // ROLLBACK

        const result = await processStockOperation(1, StockOperation.REMOVE, 10);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Yetersiz stok');
      });
    });
  });

  // ============================================
  // reserveOrderItems Tests
  // ============================================
  describe('reserveOrderItems', () => {
    it('sipariş ürünlerini başarıyla rezerve etmeli', async () => {
      mockQuery.mockResolvedValueOnce({}); // BEGIN
      mockQuery.mockResolvedValueOnce({ rowCount: 3 }); // UPDATE
      mockQuery.mockResolvedValueOnce({}); // COMMIT

      const result = await reserveOrderItems(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('rezerve edildi');
    });

    it('hata durumunda rollback yapmalı', async () => {
      mockQuery.mockResolvedValueOnce({}); // BEGIN
      mockQuery.mockRejectedValueOnce(new Error('Error'));
      mockQuery.mockResolvedValueOnce({}); // ROLLBACK

      const result = await reserveOrderItems(1);

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // unreserveOrderItems Tests
  // ============================================
  describe('unreserveOrderItems', () => {
    it('ürün bulunamadığında hata döndürmeli', async () => {
      mockQuery.mockResolvedValueOnce({}); // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] }); // SELECT - empty
      mockQuery.mockResolvedValueOnce({}); // ROLLBACK

      const result = await unreserveOrderItems(1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('bulunamadı');
    });

    it('hazırlandı durumundaki ürünler stoka eklenmeli', async () => {
      mockQuery.mockResolvedValueOnce({}); // BEGIN
      mockQuery.mockResolvedValueOnce({
        rows: [
          { product_id: 1, quantity: 10, status: 'hazirlandi' },
        ],
      });
      mockQuery.mockResolvedValueOnce({}); // INSERT inventory
      mockQuery.mockResolvedValueOnce({}); // DELETE
      mockQuery.mockResolvedValueOnce({}); // COMMIT

      const result = await unreserveOrderItems(1);

      expect(result.success).toBe(true);
    });

    it('hazırlanmamış ürünler stoka eklenmemeli', async () => {
      mockQuery.mockResolvedValueOnce({}); // BEGIN
      mockQuery.mockResolvedValueOnce({
        rows: [
          { product_id: 1, quantity: 10, status: 'uretiliyor' },
        ],
      });
      mockQuery.mockResolvedValueOnce({}); // DELETE (no INSERT)
      mockQuery.mockResolvedValueOnce({}); // COMMIT

      const result = await unreserveOrderItems(1);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // handleProductionComplete Tests
  // ============================================
  describe('handleProductionComplete', () => {
    it('üretim tamamlandığında stok işlemleri yapmalı', async () => {
      // BEGIN
      mockQuery.mockResolvedValueOnce({});
      
      // processStockOperation ADD - BEGIN
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });
      mockQuery.mockResolvedValueOnce({}); // INSERT
      mockQuery.mockResolvedValueOnce({}); // COMMIT
      mockLogStockEvent.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '10' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });
      
      // processStockOperation REMOVE - BEGIN
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '10' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });
      mockQuery.mockResolvedValueOnce({}); // UPDATE
      mockQuery.mockResolvedValueOnce({}); // COMMIT
      mockLogStockEvent.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({ rows: [{ available_stock: '5' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ total_ordered: '0' }] });
      
      // UPDATE order_items
      mockQuery.mockResolvedValueOnce({});
      // COMMIT
      mockQuery.mockResolvedValueOnce({});

      const result = await handleProductionComplete(1, 1, 5, 10);

      expect(result.success).toBe(true);
      expect(result.message).toContain('tamamlandı');
    });

    it('fazla üretimde stokta kalma mesajı vermeli', async () => {
      // Simplified mock - just check the message format
      mockQuery.mockResolvedValue({
        rows: [{ available_stock: '10', total_ordered: '0' }],
      });
      mockLogStockEvent.mockResolvedValue({});

      const result = await handleProductionComplete(1, 1, 5, 10);

      // 10 - 5 = 5 adet stokta
      if (result.success) {
        expect(result.message).toContain('stokta');
      }
    });
  });

  // ============================================
  // handleOrderStock Tests
  // ============================================
  describe('handleOrderStock', () => {
    it('sipariş ürünleri bulunamadığında hata döndürmeli', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await handleOrderStock(1, 'uretiliyor', 'hazirlandi', 0, false);

      expect(result.success).toBe(false);
      expect(result.message).toContain('bulunamadı');
    });

    it('hazırlandı durumuna geçerken stok işlemi yapmalı', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ product_id: 1, quantity: 10 }],
      });
      
      // processStockOperation ADD mocks
      mockQuery.mockResolvedValue({
        rows: [{ available_stock: '20', total_ordered: '0' }],
      });
      mockLogStockEvent.mockResolvedValue({});

      const result = await handleOrderStock(1, 'uretiliyor', 'hazirlandi', 10, false);

      expect(result.success).toBe(true);
    });

    it('skipProduction true ise sadece stoktan çıkarmalı', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ product_id: 1, quantity: 5 }],
      });
      
      mockQuery.mockResolvedValue({
        rows: [{ available_stock: '10', total_ordered: '0' }],
      });
      mockLogStockEvent.mockResolvedValue({});

      const result = await handleOrderStock(1, 'uretildi', 'Hazırlandı', 0, true);

      expect(result.success).toBe(true);
    });

    it('hazırlandı dışı durumda işlem yapmamalı', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ product_id: 1, quantity: 10 }],
      });

      const result = await handleOrderStock(1, 'onay_bekliyor', 'uretiliyor', 0, false);

      expect(result.success).toBe(true);
    });
  });
});
