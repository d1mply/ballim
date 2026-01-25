import useSWR from 'swr';
import { ProductData } from '@/components/ProductModal';

export interface PackageItem {
  productId: string;
  quantity: number;
  productCode?: string;
  productType?: string;
  availableStock?: number;
}

export interface PackageData {
  id: string;
  package_code: string;
  name: string;
  description?: string;
  price: number;
  items?: PackageItem[];
}

const productsFetcher = async (url: string): Promise<ProductData[]> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Ürünler yüklenemedi: ${res.statusText}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

const packagesFetcher = async (url: string): Promise<PackageData[]> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export interface UseProductsDataReturn {
  products: ProductData[];
  packages: PackageData[];
  isLoading: boolean;
  error: string | null;
  mutateProducts: ReturnType<typeof useSWR<ProductData[]>>['mutate'];
  mutatePackages: ReturnType<typeof useSWR<PackageData[]>>['mutate'];
}

export function useProductsData(): UseProductsDataReturn {
  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
    mutate: mutateProducts,
  } = useSWR<ProductData[]>('/api/products', productsFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
    refreshInterval: 0,
  });

  const {
    data: packagesData,
    error: packagesError,
    isLoading: packagesLoading,
    mutate: mutatePackages,
  } = useSWR<PackageData[]>('/api/packages?includeItems=true', packagesFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
    refreshInterval: 0,
  });

  return {
    products: productsData || [],
    packages: packagesData || [],
    isLoading: productsLoading || packagesLoading,
    error:
      productsError || packagesError
        ? productsError?.message || packagesError?.message || 'Veri yükleme hatası'
        : null,
    mutateProducts,
    mutatePackages,
  };
}
