'use client';

import { Icons } from '../../utils/Icons';

type PackageItem = {
  productCode: string;
  productType: string;
  quantity: number;
  availableStock?: number;
};

type PackageData = {
  id: string;
  package_code: string;
  name: string;
  description?: string;
  price: number;
  items?: PackageItem[];
};

type PackageDetailModalProps = {
  pkg: PackageData | null;
  onClose: () => void;
};

export default function PackageDetailModal({ pkg, onClose }: PackageDetailModalProps) {
  if (!pkg) return null;

  return (
    <div className="modal">
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">{pkg.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icons.XMarkIcon />
          </button>
        </div>
        <div className="modal-body space-y-4">
          <p className="text-sm text-muted-foreground">Paket Kodu: {pkg.package_code}</p>
          {pkg.description && <p className="text-sm">{pkg.description}</p>}
          <p className="font-medium">Fiyat: ₺{pkg.price.toLocaleString('tr-TR')}</p>
          {pkg.items && pkg.items.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">İçerik</h4>
              <ul className="space-y-2">
                {pkg.items.map((item, i) => {
                  const hasStock =
                    item.availableStock !== undefined && item.availableStock >= item.quantity;
                  return (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span>
                        {item.productCode} ({item.productType}) x {item.quantity}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          hasStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {hasStock ? 'Stok OK' : 'Stok Yetersiz'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-primary">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
