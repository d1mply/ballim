'use client';

import { ProductData } from '../ProductModal';
import { PackageData } from '@/hooks/useProductsData';
import { ProductCard } from './ProductCard';
import { PackageCard } from './PackageCard';

interface ProductsGridProps {
  products: ProductData[];
  packages: PackageData[];
  showPackages: boolean;
  isAdmin: boolean;
  onShowDetails: (product: ProductData) => void;
  onEdit: (product: ProductData) => void;
  onDuplicate: (product: ProductData) => void;
  onDelete: (productId: string) => void;
  onShowPackageDetails: (pkg: PackageData) => void;
}

export function ProductsGrid({
  products,
  packages,
  showPackages,
  isAdmin,
  onShowDetails,
  onEdit,
  onDuplicate,
  onDelete,
  onShowPackageDetails,
}: ProductsGridProps) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3"
      role="list"
      aria-label="Ürün listesi"
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isAdmin={isAdmin}
          onShowDetails={onShowDetails}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}

      {showPackages &&
        packages.map((pkg) => (
          <PackageCard key={`package-${pkg.id}`} pkg={pkg} onShowDetails={onShowPackageDetails} />
        ))}
    </div>
  );
}

// Skeleton loading component
export function ProductsGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="bg-card rounded-lg shadow-sm border border-border p-2 md:p-3 animate-pulse"
        >
          <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-secondary rounded-md"></div>
          <div className="space-y-2">
            <div className="h-4 bg-secondary rounded w-3/4"></div>
            <div className="h-3 bg-secondary rounded w-1/2"></div>
            <div className="h-3 bg-secondary rounded w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
