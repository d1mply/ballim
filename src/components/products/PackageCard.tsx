'use client';

import { PackageData } from '@/hooks/useProductsData';
import { Icons } from '../../utils/Icons';

interface PackageCardProps {
  pkg: PackageData;
  onShowDetails: (pkg: PackageData) => void;
}

export function PackageCard({ pkg, onShowDetails }: PackageCardProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border-2 border-blue-300 border-dashed p-2 md:p-3">
      <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-blue-50 rounded-md overflow-hidden flex items-center justify-center">
        <div className="text-center text-blue-600">
          <Icons.PackageIcon className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1" />
          <span className="text-xs font-semibold">PAKET</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-start gap-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-xs md:text-sm truncate">{pkg.package_code}</h3>
            <p className="text-xs text-muted-foreground truncate">{pkg.name}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onShowDetails(pkg)}
              className="p-0.5 md:p-1 hover:text-primary"
              title="Detayları Göster"
              aria-label="Paket detaylarını göster"
            >
              <Icons.EyeIcon className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
        </div>

        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-primary truncate">Fiyat: {pkg.price}₺</p>
          <p className="text-xs text-muted-foreground truncate">{pkg.items?.length || 0} ürün</p>
        </div>
      </div>
    </div>
  );
}
