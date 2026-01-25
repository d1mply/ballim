import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateNormalCustomerPrice,
  calculateWholesaleCustomerPrice,
  calculateOrderItemPrice,
  getWholesalePriceDetails,
  type Product,
  type FilamentPrice,
} from '@/lib/pricing';
import { query } from '@/lib/db';

// Mock the database module
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

const mockQuery = query as ReturnType<typeof vi.fn>;

// Suppress console.log/warn in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('pricing.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // calculateNormalCustomerPrice Tests
  // ============================================
  describe('calculateNormalCustomerPrice', () => {
    const mockProduct: Product = {
      id: 1,
      capacity: 10,
      piece_gram: 15,
    };

    const mockFilamentPrices: FilamentPrice[] = [
      { type: 'PLA', price: 5 },
      { type: 'PETG', price: 7 },
      { type: 'ABS', price: 6 },
    ];

    describe('başarılı senaryolar', () => {
      it('piece_gram ve filament fiyatı ile doğru hesaplama yapmalı', async () => {
        // Arrange
        const quantity = 10;
        const expectedPrice = 15 * 10 * 5; // piece_gram * quantity * price

        // Act
        const result = await calculateNormalCustomerPrice(
          mockProduct,
          quantity,
          mockFilamentPrices,
          'PLA'
        );

        // Assert
        expect(result).toBe(expectedPrice);
      });

      it('farklı filament tipleri için farklı fiyat hesaplamalı', async () => {
        const quantity = 5;
        
        const plaPrice = await calculateNormalCustomerPrice(
          mockProduct,
          quantity,
          mockFilamentPrices,
          'PLA'
        );
        
        const petgPrice = await calculateNormalCustomerPrice(
          mockProduct,
          quantity,
          mockFilamentPrices,
          'PETG'
        );

        expect(plaPrice).toBe(15 * 5 * 5);  // 375
        expect(petgPrice).toBe(15 * 5 * 7); // 525
        expect(petgPrice).toBeGreaterThan(plaPrice);
      });

      it('piece_gram yoksa capacity kullanmalı', async () => {
        const productWithoutPieceGram: Product = {
          id: 2,
          capacity: 20,
        };
        const quantity = 3;

        const result = await calculateNormalCustomerPrice(
          productWithoutPieceGram,
          quantity,
          mockFilamentPrices,
          'PLA'
        );

        expect(result).toBe(20 * 3 * 5); // capacity * quantity * price
      });
    });

    describe('varsayılan değer senaryoları', () => {
      it('filament tipi bulunamadığında varsayılan 8₺/gr kullanmalı', async () => {
        const quantity = 10;
        
        const result = await calculateNormalCustomerPrice(
          mockProduct,
          quantity,
          mockFilamentPrices,
          'UNKNOWN_FILAMENT'
        );

        expect(result).toBe(15 * 10 * 8); // varsayılan 8₺/gr
      });

      it('boş filament fiyat listesi ile varsayılan kullanmalı', async () => {
        const quantity = 5;

        const result = await calculateNormalCustomerPrice(
          mockProduct,
          quantity,
          [],
          'PLA'
        );

        expect(result).toBe(15 * 5 * 8);
      });
    });

    describe('edge cases', () => {
      it('quantity = 0 için 0 döndürmeli', async () => {
        const result = await calculateNormalCustomerPrice(
          mockProduct,
          0,
          mockFilamentPrices,
          'PLA'
        );

        expect(result).toBe(0);
      });

      it('capacity ve piece_gram ikisi de 0 ise 0 döndürmeli', async () => {
        const productWithZeroGram: Product = {
          id: 3,
          capacity: 0,
          piece_gram: 0,
        };

        const result = await calculateNormalCustomerPrice(
          productWithZeroGram,
          10,
          mockFilamentPrices,
          'PLA'
        );

        expect(result).toBe(0);
      });

      it('büyük quantity değerlerini doğru hesaplamalı', async () => {
        const largeQuantity = 10000;

        const result = await calculateNormalCustomerPrice(
          mockProduct,
          largeQuantity,
          mockFilamentPrices,
          'PLA'
        );

        expect(result).toBe(15 * 10000 * 5);
      });
    });
  });

  // ============================================
  // calculateWholesaleCustomerPrice Tests
  // ============================================
  describe('calculateWholesaleCustomerPrice', () => {
    const mockProduct: Product = {
      id: 1,
      capacity: 10,
      piece_gram: 15,
    };

    describe('başarılı senaryolar', () => {
      it('fiyat aralığı bulunduğunda doğru hesaplama yapmalı', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ min_gram: 10, max_gram: 50, price: 100 }],
          rowCount: 1,
        });

        const quantity = 5;
        const discountRate = 20;
        // basePrice * (1 - discount/100) * quantity = 100 * 0.8 * 5 = 400

        const result = await calculateWholesaleCustomerPrice(
          mockProduct,
          quantity,
          discountRate
        );

        expect(result).toBe(400);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('wholesale_price_ranges'),
          [15] // piece_gram
        );
      });

      it('%0 iskonto ile tam fiyat döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ min_gram: 10, max_gram: 50, price: 100 }],
          rowCount: 1,
        });

        const result = await calculateWholesaleCustomerPrice(mockProduct, 2, 0);

        expect(result).toBe(200); // 100 * 1 * 2
      });

      it('%50 iskonto ile yarı fiyat döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ min_gram: 10, max_gram: 50, price: 100 }],
          rowCount: 1,
        });

        const result = await calculateWholesaleCustomerPrice(mockProduct, 4, 50);

        expect(result).toBe(200); // 100 * 0.5 * 4
      });
    });

    describe('hata senaryoları', () => {
      it('fiyat aralığı bulunamadığında hata fırlatmalı', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

        await expect(
          calculateWholesaleCustomerPrice(mockProduct, 5, 10)
        ).rejects.toThrow('uygun fiyat aralığı bulunamadı');
      });
    });

    describe('edge cases', () => {
      it('%100 iskonto ile 0 döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ min_gram: 10, max_gram: 50, price: 100 }],
          rowCount: 1,
        });

        const result = await calculateWholesaleCustomerPrice(mockProduct, 5, 100);

        expect(result).toBe(0);
      });

      it('quantity = 0 için 0 döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ min_gram: 10, max_gram: 50, price: 100 }],
          rowCount: 1,
        });

        const result = await calculateWholesaleCustomerPrice(mockProduct, 0, 20);

        expect(result).toBe(0);
      });
    });
  });

  // ============================================
  // calculateOrderItemPrice Tests
  // ============================================
  describe('calculateOrderItemPrice', () => {
    describe('pazaryeri siparişleri', () => {
      it('customerId null ise 0.01 döndürmeli', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, capacity: 10, piece_gram: 15 }],
          rowCount: 1,
        });

        const result = await calculateOrderItemPrice(null, 1, 10, 'PLA');

        expect(result).toBe(0.01);
      });
    });

    describe('hata senaryoları', () => {
      it('ürün bulunamadığında hata fırlatmalı', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

        await expect(
          calculateOrderItemPrice(1, 999, 10, 'PLA')
        ).rejects.toThrow('Ürün bulunamadı');
      });

      it('müşteri bulunamadığında hata fırlatmalı', async () => {
        // Product query
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, capacity: 10, piece_gram: 15 }],
          rowCount: 1,
        });
        // Customer query
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

        await expect(
          calculateOrderItemPrice(999, 1, 10, 'PLA')
        ).rejects.toThrow('Müşteri bulunamadı');
      });

      it('normal müşteri için filament tipi yoksa hata fırlatmalı', async () => {
        // Product query
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, capacity: 10, piece_gram: 15 }],
          rowCount: 1,
        });
        // Customer query
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, customer_category: 'normal', discount_rate: 0 }],
          rowCount: 1,
        });

        await expect(
          calculateOrderItemPrice(1, 1, 10)
        ).rejects.toThrow('filament tipi gerekli');
      });
    });

    describe('normal müşteri hesaplaması', () => {
      it('normal müşteri için doğru fiyat hesaplamalı', async () => {
        // Product query
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, capacity: 10, piece_gram: 15 }],
          rowCount: 1,
        });
        // Customer query
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, customer_category: 'normal', discount_rate: 0 }],
          rowCount: 1,
        });
        // Filament prices query
        mockQuery.mockResolvedValueOnce({
          rows: [{ filament_type: 'PLA', price_per_gram: 5 }],
          rowCount: 1,
        });

        const result = await calculateOrderItemPrice(1, 1, 10, 'PLA');

        // 15gr * 10 adet * 5₺/gr = 750₺
        expect(result).toBe(750);
      });
    });

    describe('toptancı müşteri hesaplaması', () => {
      it('toptancı müşteri için doğru fiyat hesaplamalı', async () => {
        // Product query
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, capacity: 10, piece_gram: 15 }],
          rowCount: 1,
        });
        // Customer query
        mockQuery.mockResolvedValueOnce({
          rows: [{ id: 1, customer_category: 'wholesale', discount_rate: 20 }],
          rowCount: 1,
        });
        // Wholesale price range query
        mockQuery.mockResolvedValueOnce({
          rows: [{ min_gram: 10, max_gram: 50, price: 100 }],
          rowCount: 1,
        });

        const result = await calculateOrderItemPrice(1, 1, 5);

        // 100 * (1 - 0.20) * 5 = 400
        expect(result).toBe(400);
      });
    });
  });

  // ============================================
  // getWholesalePriceDetails Tests
  // ============================================
  describe('getWholesalePriceDetails', () => {
    describe('başarılı senaryolar', () => {
      it('tüm fiyat detaylarını doğru döndürmeli', async () => {
        // Product and customer queries (parallel)
        mockQuery
          .mockResolvedValueOnce({
            rows: [{ capacity: 10, piece_gram: 20 }],
            rowCount: 1,
          })
          .mockResolvedValueOnce({
            rows: [{ discount_rate: 30 }],
            rowCount: 1,
          })
          .mockResolvedValueOnce({
            rows: [{ min_gram: 15, max_gram: 50, price: 80 }],
            rowCount: 1,
          });

        const result = await getWholesalePriceDetails(1, 1, 10);

        expect(result).toEqual({
          totalGrams: 200, // 20 * 10
          basePrice: 80,
          discountRate: 30,
          finalPrice: 560, // 80 * 0.7 * 10
          priceRange: '15-50gr',
        });
      });
    });

    describe('hata senaryoları', () => {
      it('ürün veya müşteri bulunamadığında hata fırlatmalı', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await expect(
          getWholesalePriceDetails(1, 1, 10)
        ).rejects.toThrow('Ürün veya müşteri bulunamadı');
      });

      it('fiyat aralığı bulunamadığında hata fırlatmalı', async () => {
        mockQuery
          .mockResolvedValueOnce({
            rows: [{ capacity: 10, piece_gram: 5 }],
            rowCount: 1,
          })
          .mockResolvedValueOnce({
            rows: [{ discount_rate: 10 }],
            rowCount: 1,
          })
          .mockResolvedValueOnce({
            rows: [],
            rowCount: 0,
          });

        await expect(
          getWholesalePriceDetails(1, 1, 10)
        ).rejects.toThrow('fiyat aralığı bulunamadı');
      });
    });

    describe('edge cases', () => {
      it('discount_rate null ise 0 olarak işlemeli', async () => {
        mockQuery
          .mockResolvedValueOnce({
            rows: [{ capacity: 10, piece_gram: 20 }],
            rowCount: 1,
          })
          .mockResolvedValueOnce({
            rows: [{ discount_rate: null }],
            rowCount: 1,
          })
          .mockResolvedValueOnce({
            rows: [{ min_gram: 15, max_gram: 50, price: 100 }],
            rowCount: 1,
          });

        const result = await getWholesalePriceDetails(1, 1, 5);

        expect(result.discountRate).toBe(0);
        expect(result.finalPrice).toBe(500); // 100 * 1 * 5
      });
    });
  });
});
