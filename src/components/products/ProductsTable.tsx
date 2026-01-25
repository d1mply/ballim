'use client';

import { ProductData } from '../ProductModal';
import { PackageData } from '@/hooks/useProductsData';
import { Icons } from '../../utils/Icons';

interface ProductsTableProps {
  products: ProductData[];
  packages: PackageData[];
  showPackages: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  onShowDetails: (product: ProductData) => void;
  onEdit: (product: ProductData) => void;
  onDuplicate: (product: ProductData) => void;
  onDelete: (productId: string) => void;
  onShowPackageDetails: (pkg: PackageData) => void;
}

export function ProductsTable({
  products,
  packages,
  showPackages,
  isAdmin,
  isLoading,
  onShowDetails,
  onEdit,
  onDuplicate,
  onDelete,
  onShowPackageDetails,
}: ProductsTableProps) {
  const formatDimensions = (product: ProductData) =>
    `${product.dimensionX}x${product.dimensionY}x${product.dimensionZ} mm`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" role="grid" aria-label="Ürün tablosu">
        <thead>
          <tr className="bg-secondary">
            <th className="p-2 text-left" scope="col">Kod</th>
            <th className="p-2 text-left" scope="col">Tür</th>
            <th className="p-2 text-left" scope="col">Boyutlar</th>
            <th className="p-2 text-left" scope="col">Kapasite</th>
            <th className="p-2 text-left" scope="col">Baskı Süresi</th>
            <th className="p-2 text-left" scope="col">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <ProductsTableSkeleton />
          ) : (
            <>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-border">
                  <td className="p-2">{product.code}</td>
                  <td className="p-2">{product.productType}</td>
                  <td className="p-2">{formatDimensions(product)}</td>
                  <td className="p-2">{product.capacity} adet/tabla</td>
                  <td className="p-2">{product.printTime} saat</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onShowDetails(product)}
                        className="p-1 hover:text-primary"
                        title="Detayları Göster"
                        aria-label="Ürün detaylarını göster"
                      >
                        <Icons.EyeIcon />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => onEdit(product)}
                            className="p-1 hover:text-primary"
                            title="Düzenle"
                            aria-label="Ürünü düzenle"
                          >
                            <Icons.EditIcon />
                          </button>
                          <button
                            onClick={() => onDuplicate(product)}
                            className="p-1 hover:text-primary"
                            title="Kopyala"
                            aria-label="Ürünü kopyala"
                          >
                            <Icons.ClipboardIcon />
                          </button>
                          <button
                            onClick={() => onDelete(product.id!)}
                            className="p-1 hover:text-destructive"
                            title="Sil"
                            aria-label="Ürünü sil"
                          >
                            <Icons.TrashIcon />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {showPackages &&
                packages.map((pkg) => (
                  <tr key={`package-${pkg.id}`} className="border-b border-border bg-blue-50/30">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{pkg.package_code}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          PAKET
                        </span>
                      </div>
                    </td>
                    <td className="p-2">{pkg.name}</td>
                    <td className="p-2">-</td>
                    <td className="p-2">{pkg.items?.length || 0} ürün</td>
                    <td className="p-2">-</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onShowPackageDetails(pkg)}
                          className="p-1 hover:text-primary"
                          title="Detayları Göster"
                          aria-label="Paket detaylarını göster"
                        >
                          <Icons.EyeIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProductsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <tr key={`table-skeleton-${index}`} className="border-b border-border animate-pulse">
          <td className="p-2">
            <div className="h-4 bg-secondary rounded w-20"></div>
          </td>
          <td className="p-2">
            <div className="h-4 bg-secondary rounded w-32"></div>
          </td>
          <td className="p-2">
            <div className="h-4 bg-secondary rounded w-24"></div>
          </td>
          <td className="p-2">
            <div className="h-4 bg-secondary rounded w-16"></div>
          </td>
          <td className="p-2">
            <div className="h-4 bg-secondary rounded w-20"></div>
          </td>
          <td className="p-2">
            <div className="h-4 bg-secondary rounded w-24"></div>
          </td>
        </tr>
      ))}
    </>
  );
}
