'use client';

import { Icons } from '../../utils/Icons';
import type { StockItem } from '../../hooks/useCart';
import type { LoggedInUser } from '../../app/page';
import { getStockStatus } from './ProductListSection';

interface CartItemCardProps {
  item: StockItem;
  index: number;
  currentUser: LoggedInUser;
  cartPrices: Record<string, number>;
  onRemove: (id: string) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
}

export default function CartItemCard({
  item,
  index,
  currentUser,
  cartPrices,
  onRemove,
  onUpdateQuantity,
}: CartItemCardProps) {
  const key = `${item.id}-${item.quantity}`;
  const totalPrice = cartPrices[key] || 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {item.image ? (
            <img src={item.image} alt={item.productType} className="w-16 h-16 rounded-lg object-cover" />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
              <Icons.PackageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{item.code}</h4>
          <p className="text-sm text-gray-500 mb-2">{item.productType}</p>
          {item.isPackage && (
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded mb-2">
              📦 Paket
            </span>
          )}

          {!item.isPackage && (() => {
            const stockStatus = getStockStatus(item.availableStock || 0, item.reservedStock || 0, item.quantity || 1);
            return (
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium mb-2 ${stockStatus.bgColor} ${stockStatus.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  (item.availableStock || 0) > 0 ? 'bg-green-500' : (item.reservedStock || 0) > 0 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                {stockStatus.status}
              </div>
            );
          })()}

          <p className="text-sm font-medium text-blue-600">
            {(() => {
              if (item.isPackage && item.price) return `${item.price}₺ / paket`;
              const quantity = item.quantity || 1;
              const pricePerPiece = totalPrice > 0 ? (totalPrice / quantity).toFixed(2) : '0.00';
              return `${pricePerPiece}₺ / adet`;
            })()}
          </p>

          {!item.isPackage && currentUser?.customerCategory === 'normal' && (
            <p className="text-xs text-gray-500">
              {(() => {
                const filamentType = item.filaments?.[0]?.type || 'PLA';
                const filamentPrice = currentUser?.filamentPrices?.find(fp => fp.type === filamentType);
                return filamentPrice
                  ? `${filamentType} ${filamentPrice.price}₺/gr`
                  : `${filamentType} 8₺/gr (varsayılan)`;
              })()}
            </p>
          )}
        </div>

        <button
          onClick={() => onRemove(item.id || '')}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Sepetten Çıkar"
        >
          <Icons.TrashIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Miktar:</span>
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => onUpdateQuantity(index, Math.max(1, (item.quantity || 1) - 1))}
              className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
              disabled={(item.quantity || 1) <= 1}
            >
              <Icons.MinusIcon className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="1"
              value={item.quantity || 1}
              onChange={e => {
                const newQuantity = parseInt(e.target.value) || 1;
                onUpdateQuantity(index, newQuantity);
              }}
              className="w-16 px-2 py-2 bg-white font-medium text-center border-0 focus:outline-none focus:bg-blue-50 focus:ring-2 focus:ring-blue-300 rounded"
            />
            <button
              onClick={() => onUpdateQuantity(index, (item.quantity || 1) + 1)}
              className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
            >
              <Icons.PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{totalPrice.toFixed(2)}₺</p>
        </div>
      </div>
    </div>
  );
}
