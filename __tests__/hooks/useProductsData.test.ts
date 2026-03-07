import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { mutate } from 'swr';
import { useProductsData } from '@/hooks/useProductsData';

const mockProducts = [
  {
    id: '1',
    code: 'PRD-001',
    productType: 'Figür',
    capacity: 10,
    dimensionX: 10,
    dimensionY: 10,
    dimensionZ: 10,
    printTime: 60,
    totalGram: 100,
    pieceGram: 10,
    filaments: [],
    availableStock: 5,
    createdAt: '2024-01-01',
  },
];

const mockPackages = [
  {
    id: 'pkg-1',
    package_code: 'PKG-001',
    name: 'Paket 1',
    price: 100,
  },
];

describe('useProductsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate('/api/products', undefined);
    mutate('/api/packages?includeItems=true', undefined);
    vi.mocked(global.fetch)
      .mockImplementation((url: string | URL) => {
        const u = typeof url === 'string' ? url : url.toString();
        if (u.includes('/api/products') && !u.includes('packages')) {
          return Promise.resolve(
            new Response(JSON.stringify(mockProducts), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        if (u.includes('/api/packages')) {
          return Promise.resolve(
            new Response(JSON.stringify(mockPackages), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return Promise.reject(new Error('Unknown URL'));
      });
  });

  it('ürünler ve paketler yüklendiğinde döndürmeli', async () => {
    const { result } = renderHook(() => useProductsData());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].code).toBe('PRD-001');
    expect(result.current.packages).toHaveLength(1);
    expect(result.current.packages[0].package_code).toBe('PKG-001');
    expect(result.current.error).toBeNull();
  });

  it('başlangıçta isLoading true olmalı', () => {
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useProductsData());
    expect(result.current.isLoading).toBe(true);
  });

  it('ürünler API hatası verince error set olmalı', async () => {
    vi.mocked(global.fetch).mockImplementation((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/api/products') && !u.includes('packages')) {
        return Promise.resolve(
          new Response('Server Error', { status: 500 })
        );
      }
      if (u.includes('/api/packages')) {
        return Promise.resolve(
          new Response(JSON.stringify([]), { status: 200 })
        );
      }
      return Promise.reject(new Error('Unknown'));
    });
    const { result } = renderHook(() => useProductsData());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.products).toEqual([]);
  });

  it('API array dışı döndürürse boş dizi kullanmalı', async () => {
    vi.mocked(global.fetch).mockImplementation((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/api/products') && !u.includes('packages')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), { status: 200 })
        );
      }
      if (u.includes('/api/packages')) {
        return Promise.resolve(
          new Response(JSON.stringify(null), { status: 200 })
        );
      }
      return Promise.reject(new Error('Unknown'));
    });
    const { result } = renderHook(() => useProductsData());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.products).toEqual([]);
    expect(result.current.packages).toEqual([]);
  });

  it('mutateProducts ve mutatePackages fonksiyon döndürmeli', async () => {
    const { result } = renderHook(() => useProductsData());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(typeof result.current.mutateProducts).toBe('function');
    expect(typeof result.current.mutatePackages).toBe('function');
  });
});
