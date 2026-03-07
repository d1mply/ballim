import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductFilters } from '@/hooks/useProductFilters';
import type { ProductData } from '@/components/ProductModal';
import type { PackageData } from '@/hooks/useProductsData';

const mockProduct = (
  overrides: Partial<ProductData> = {}
): ProductData => ({
  code: 'PRD-001',
  productType: 'Figür',
  capacity: 10,
  dimensionX: 10,
  dimensionY: 10,
  dimensionZ: 10,
  printTime: 60,
  totalGram: 100,
  pieceGram: 10,
  filaments: [{ type: 'PLA', color: 'Kırmızı', brand: 'X', weight: 1000 }],
  availableStock: 5,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockPackage = (overrides: Partial<PackageData> = {}): PackageData => ({
  id: 'pkg-1',
  package_code: 'PKG-001',
  name: 'Test Paket',
  description: 'Açıklama',
  price: 100,
  ...overrides,
});

describe('useProductFilters', () => {
  it('başlangıçta tüm ürünleri ve paketleri döndürmeli', () => {
    const products: ProductData[] = [
      mockProduct({ code: 'A' }),
      mockProduct({ code: 'B' }),
    ];
    const packages: PackageData[] = [mockPackage()];
    const { result } = renderHook(() => useProductFilters(products, packages));
    expect(result.current.filteredProducts).toHaveLength(2);
    expect(result.current.filteredPackages).toHaveLength(1);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('searchTerm ile ürün filtrelemeli', () => {
    const products: ProductData[] = [
      mockProduct({ code: 'ALPHA' }),
      mockProduct({ code: 'BETA' }),
    ];
    const { result } = renderHook(() =>
      useProductFilters(products, [])
    );
    act(() => {
      result.current.setFilters((prev) => ({ ...prev, searchTerm: 'alpha' }));
    });
    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].code).toBe('ALPHA');
  });

  it('category ile filtrelemeli', () => {
    const products: ProductData[] = [
      mockProduct({ productType: 'Figür' }),
      mockProduct({ productType: 'Aksesuar' }),
    ];
    const { result } = renderHook(() => useProductFilters(products, []));
    act(() => {
      result.current.setFilters((prev) => ({ ...prev, category: 'Figür' }));
    });
    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].productType).toBe('Figür');
  });

  it('sortBy değişince sıralama güncellenmeli', () => {
    const products: ProductData[] = [
      mockProduct({ code: 'C', availableStock: 1 }),
      mockProduct({ code: 'A', availableStock: 10 }),
      mockProduct({ code: 'B', availableStock: 5 }),
    ];
    const { result } = renderHook(() => useProductFilters(products, []));
    expect(result.current.filteredProducts[0].code).toBe('A');
    act(() => {
      result.current.setSortBy('alphabetical-desc');
    });
    expect(result.current.filteredProducts[0].code).toBe('C');
    act(() => {
      result.current.setSortBy('stock-high');
    });
    expect(result.current.filteredProducts[0].availableStock).toBe(10);
  });

  it('resetFilters filtreleri sıfırlamalı', () => {
    const products: ProductData[] = [mockProduct()];
    const { result } = renderHook(() => useProductFilters(products, []));
    act(() => {
      result.current.setFilters((prev) => ({ ...prev, searchTerm: 'x' }));
    });
    expect(result.current.hasActiveFilters).toBe(true);
    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.filters.searchTerm).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('categories, filamentTypes, filamentColors ürünlerden türetilmeli', () => {
    const products: ProductData[] = [
      mockProduct({ productType: 'Figür', filaments: [{ type: 'PLA', color: 'Kırmızı', brand: '', weight: 0 }] }),
      mockProduct({ productType: 'Aksesuar', filaments: [{ type: 'PETG', color: 'Mavi', brand: '', weight: 0 }] }),
    ];
    const { result } = renderHook(() => useProductFilters(products, []));
    expect(result.current.categories).toContain('Figür');
    expect(result.current.categories).toContain('Aksesuar');
    expect(result.current.filamentTypes).toContain('PLA');
    expect(result.current.filamentTypes).toContain('PETG');
    expect(result.current.filamentColors).toContain('Kırmızı');
    expect(result.current.filamentColors).toContain('Mavi');
  });

  it('boş ürün listesi ile çalışmalı', () => {
    const { result } = renderHook(() => useProductFilters([], []));
    expect(result.current.filteredProducts).toHaveLength(0);
    expect(result.current.filteredPackages).toHaveLength(0);
    expect(result.current.categories).toEqual([]);
  });
});
