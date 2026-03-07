'use client';

import { Icons } from '../../utils/Icons';
import type { LoggedInUser } from '../../app/page';

interface PackageListSectionProps {
  packages: any[];
  isLoadingPackages: boolean;
  currentUser: LoggedInUser | null;
  onAddPackageToCart: (pkg: any) => void;
}

export default function PackageListSection({
  packages,
  isLoadingPackages,
  currentUser,
  onAddPackageToCart,
}: PackageListSectionProps) {
  if (isLoadingPackages) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="mt-2 text-muted-foreground">Paketler yükleniyor...</p>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
        Henüz paket oluşturulmamış.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {packages.map(pkg => {
        const minStock =
          pkg.items?.length > 0
            ? Math.min(...pkg.items.map((item: any) => item.availableStock || 0))
            : 0;
        const hasStock = minStock > 0;
        const stockStatus = hasStock ? 'Stokta Var' : 'Stokta Yok';
        const stockColor = hasStock
          ? 'text-green-600 bg-green-50'
          : 'text-red-600 bg-red-50';

        return (
          <div key={pkg.id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{pkg.name}</h3>
                  <span className="text-sm font-mono text-muted-foreground">
                    {pkg.package_code}
                  </span>
                </div>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {pkg.description}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-primary">
                    {pkg.price}₺
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${stockColor}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${hasStock ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    {stockStatus}
                  </span>
                </div>
              </div>
              {currentUser?.type === 'customer' && (
                <button
                  onClick={() => onAddPackageToCart(pkg)}
                  className="flex items-center gap-1.5 py-2 px-4 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                >
                  <Icons.ShoppingCartIcon className="w-4 h-4" />
                  Sepete Ekle
                </button>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3">Paket İçeriği:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pkg.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-sm">
                        {item.productCode}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {item.productType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.quantity} adet
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          item.availableStock >= item.quantity
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        Stok: {item.availableStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
