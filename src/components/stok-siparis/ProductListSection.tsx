'use client';

import { useState } from 'react';
import { Icons } from '../../utils/Icons';
import type { StockItem } from '../../hooks/useCart';
import type { LoggedInUser } from '../../app/page';

export function getStockStatus(
  availableStock: number,
  reservedStock: number,
  _orderedAmount: number,
) {
  if (availableStock > 0) {
    return {
      status: `Stok ${availableStock} (${reservedStock} rezerve)`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    };
  }
  if (reservedStock > 0) {
    return {
      status: `Stok 0 (${reservedStock} rezerve)`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    };
  }
  return {
    status: 'Stokta Yok',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  };
}

interface ProductListSectionProps {
  products: StockItem[];
  currentUser: LoggedInUser | null;
  onAddToCart: (item: StockItem) => void;
}

export default function ProductListSection({
  products,
  currentUser,
  onAddToCart,
}: ProductListSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('Tüm Ürünler');

  const productTypes: string[] = Array.from(
    new Set(products.map(p => p.productType)),
  );

  const filteredProducts = products.filter(item => {
    try {
      const searchMatch =
        (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.productType && item.productType.toLowerCase().includes(searchQuery.toLowerCase()));
      const filterMatch =
        selectedType === 'Tüm Ürünler' ||
        (selectedType === 'Stokta Var' && item.stockAmount > 0) ||
        (selectedType === 'Stokta Yok' && item.stockAmount === 0);
      return searchMatch && filterMatch;
    } catch (error) {
      console.error('Stok ürün filtreleme hatası:', error, item);
      return false;
    }
  });

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <div className="search-container">
          <Icons.SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Ürün kodu veya türü ile ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
        >
          <option>Tüm Ürünler</option>
          {productTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted text-left">
            <tr>
              <th className="py-3 px-4 font-medium">Ürün</th>
              <th className="py-3 px-4 font-medium">Tip</th>
              <th className="py-3 px-4 font-medium">Boyut</th>
              <th className="py-3 px-4 font-medium">Kapasite</th>
              <th className="py-3 px-4 font-medium">Stok Durumu</th>
              {currentUser?.type === 'customer' && (
                <th className="py-3 px-4 font-medium"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(item => {
                const stockStatus = getStockStatus(item.availableStock, item.reservedStock, 1);
                return (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.productType} className="w-12 h-12 rounded-md object-cover bg-muted" />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                            <Icons.PackageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{item.code}</div>
                          <div className="text-sm text-muted-foreground">{item.productType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{item.filaments?.[0]?.type || '-'}</td>
                    <td className="py-3 px-4">{item.dimensionX}x{item.dimensionY}x{item.dimensionZ} mm</td>
                    <td className="py-3 px-4">{item.capacity} adet</td>
                    <td className="py-3 px-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
                        <div className={`w-2 h-2 rounded-full ${
                          item.availableStock > 0 ? 'bg-green-500' : item.reservedStock > 0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        {stockStatus.status}
                      </div>
                    </td>
                    {currentUser?.type === 'customer' && (
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onAddToCart(item)}
                          className="flex items-center gap-1.5 py-1.5 px-3 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                        >
                          <Icons.ShoppingCartIcon className="w-4 h-4" />
                          Sepete Ekle
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={currentUser?.type === 'customer' ? 6 : 5} className="py-8 text-center text-muted-foreground">
                  Ürün bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="block lg:hidden space-y-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(item => {
            const stockStatus = getStockStatus(item.availableStock, item.reservedStock, 1);
            return (
              <div key={item.id} className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-start gap-3 mb-3">
                  {item.image ? (
                    <img src={item.image} alt={item.productType} className="w-16 h-16 rounded-md object-cover bg-muted flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <Icons.PackageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-lg mb-1">{item.code}</div>
                    <div className="text-sm text-muted-foreground mb-2">{item.productType}</div>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">Filament:</span> {item.filaments?.[0]?.type || '-'}</div>
                      <div><span className="font-medium">Boyut:</span> {item.dimensionX}x{item.dimensionY}x{item.dimensionZ} mm</div>
                      <div><span className="font-medium">Kapasite:</span> {item.capacity} adet</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
                    <div className={`w-2 h-2 rounded-full ${
                      item.availableStock > 0 ? 'bg-green-500' : item.reservedStock > 0 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    {stockStatus.status}
                  </div>

                  {currentUser?.type === 'customer' && (
                    <button
                      onClick={() => onAddToCart(item)}
                      className="flex items-center gap-1.5 py-2 px-4 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                    >
                      <Icons.ShoppingCartIcon className="w-4 h-4" />
                      Sepete Ekle
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
            Ürün bulunamadı.
          </div>
        )}
      </div>
    </>
  );
}
