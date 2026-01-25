import { useMemo, useState, useCallback } from 'react';
import { ProductData } from '@/components/ProductModal';
import { PackageData } from './useProductsData';

export interface ProductFilters {
  searchTerm: string;
  category: string;
  printTimeMin: number | '';
  printTimeMax: number | '';
  filamentType: string;
  filamentColor: string;
  stockStatus: string;
  totalGramMin: number | '';
  totalGramMax: number | '';
  stockMin: number | '';
  stockMax: number | '';
}

export type SortOption =
  | 'alphabetical-asc'
  | 'alphabetical-desc'
  | 'newest'
  | 'oldest'
  | 'stock-high'
  | 'stock-low';

const initialFilters: ProductFilters = {
  searchTerm: '',
  category: '',
  printTimeMin: '',
  printTimeMax: '',
  filamentType: '',
  filamentColor: '',
  stockStatus: '',
  totalGramMin: '',
  totalGramMax: '',
  stockMin: '',
  stockMax: '',
};

export interface UseProductFiltersReturn {
  filters: ProductFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProductFilters>>;
  sortBy: SortOption;
  setSortBy: React.Dispatch<React.SetStateAction<SortOption>>;
  resetFilters: () => void;
  filteredProducts: ProductData[];
  filteredPackages: PackageData[];
  categories: string[];
  filamentTypes: string[];
  filamentColors: string[];
  hasActiveFilters: boolean;
}

export function useProductFilters(
  products: ProductData[],
  packages: PackageData[]
): UseProductFiltersReturn {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical-asc');

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Derived data from products
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.productType).filter(Boolean))) as string[],
    [products]
  );

  const filamentTypes = useMemo(
    () =>
      Array.from(
        new Set(products.flatMap((p) => p.filaments?.map((f) => f.type).filter(Boolean) || []))
      ) as string[],
    [products]
  );

  const filamentColors = useMemo(
    () =>
      Array.from(
        new Set(products.flatMap((p) => p.filaments?.map((f) => f.color).filter(Boolean) || []))
      ) as string[],
    [products]
  );

  // Filtered products
  const filteredProducts = useMemo(() => {
    const searchLower = filters.searchTerm.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const categoryMatch =
        !filters.category ||
        product.productType?.toLowerCase().includes(filters.category.toLowerCase());

      const printTime = product.printTime || 0;
      const printTimeMatch =
        (filters.printTimeMin === '' || printTime >= filters.printTimeMin) &&
        (filters.printTimeMax === '' || printTime <= filters.printTimeMax);

      const filamentTypeMatch = !filters.filamentType
        ? true
        : product.filaments?.some(
            (f) => f.type?.toLowerCase() === filters.filamentType.toLowerCase()
          ) ?? false;

      const filamentColorMatch = !filters.filamentColor
        ? true
        : product.filaments?.some((f) =>
            f.color?.toLowerCase().includes(filters.filamentColor.toLowerCase())
          ) ?? false;

      const stock = product.availableStock ?? 0;
      const stockStatusMatch =
        filters.stockStatus === ''
          ? true
          : filters.stockStatus === 'stokta-var'
          ? stock > 0
          : stock === 0;

      const stockRangeMatch =
        (filters.stockMin === '' || stock >= filters.stockMin) &&
        (filters.stockMax === '' || stock <= filters.stockMax);

      const totalGram = product.totalGram ?? 0;
      const gramMatch =
        (filters.totalGramMin === '' || totalGram >= filters.totalGramMin) &&
        (filters.totalGramMax === '' || totalGram <= filters.totalGramMax);

      const textMatch =
        (!product.code && !product.productType) ||
        product.code?.toLowerCase().includes(searchLower) ||
        product.productType?.toLowerCase().includes(searchLower);

      return (
        textMatch &&
        categoryMatch &&
        printTimeMatch &&
        filamentTypeMatch &&
        filamentColorMatch &&
        stockStatusMatch &&
        stockRangeMatch &&
        gramMatch
      );
    });

    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical-asc': {
          const nameA = (a.code || a.productType || '').toLowerCase();
          const nameB = (b.code || b.productType || '').toLowerCase();
          return nameA.localeCompare(nameB, 'tr', { sensitivity: 'base' });
        }
        case 'alphabetical-desc': {
          const nameA2 = (a.code || a.productType || '').toLowerCase();
          const nameB2 = (b.code || b.productType || '').toLowerCase();
          return nameB2.localeCompare(nameA2, 'tr', { sensitivity: 'base' });
        }
        case 'newest': {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
        case 'oldest': {
          const dateA2 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA2 - dateB2;
        }
        case 'stock-high':
          return (b.availableStock || 0) - (a.availableStock || 0);
        case 'stock-low':
          return (a.availableStock || 0) - (b.availableStock || 0);
        default:
          return 0;
      }
    });
  }, [filters, products, sortBy]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    const searchLower = filters.searchTerm.trim().toLowerCase();
    return packages.filter((pkg) => {
      return (
        pkg.name?.toLowerCase().includes(searchLower) ||
        pkg.package_code?.toLowerCase().includes(searchLower) ||
        pkg.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [filters.searchTerm, packages]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm !== '' ||
      filters.category !== '' ||
      filters.printTimeMin !== '' ||
      filters.printTimeMax !== '' ||
      filters.filamentType !== '' ||
      filters.filamentColor !== '' ||
      filters.stockStatus !== '' ||
      filters.totalGramMin !== '' ||
      filters.totalGramMax !== '' ||
      filters.stockMin !== '' ||
      filters.stockMax !== ''
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    sortBy,
    setSortBy,
    resetFilters,
    filteredProducts,
    filteredPackages,
    categories,
    filamentTypes,
    filamentColors,
    hasActiveFilters,
  };
}
