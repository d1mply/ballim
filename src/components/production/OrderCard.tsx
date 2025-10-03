// Sipariş Kartı Komponenti - Clean Code için ayrı component

import React from 'react';
import { OrderItem, OrderProduct } from '@/types';
import { getStatusInfo, getStatusLabel, formatDate } from '@/utils/helpers';

interface OrderCardProps {
  order: OrderItem;
  onProductStatusChange: (order: OrderItem, product: OrderProduct) => void;
  onCompleteProduction: (order: OrderItem, product: OrderProduct) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onProductStatusChange,
  onCompleteProduction
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      {/* Sipariş başlığı */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {order.orderCode}
          </h3>
          <p className="text-sm text-gray-600">
            {order.customerName} • {formatDate(order.orderDate)}
          </p>
          {order.notes && (
            <p className="text-sm text-gray-500 mt-1">
              Not: {order.notes}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            getStatusInfo(order.status).bg
          } ${getStatusInfo(order.status).color}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>

      {/* Ürünler */}
      <div className="space-y-3">
        {order.products.map((product) => (
          <div key={product.id} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-gray-900">
                  {product.productCode} - {product.productType}
                </h4>
                <p className="text-sm text-gray-600">
                  Miktar: {product.quantity} adet
                </p>
                {product.availableStock !== undefined && (
                  <p className="text-sm text-gray-600">
                    Stok: {product.availableStock} adet
                    {product.reservedStock !== undefined && product.reservedStock > 0 && (
                      <span className="text-orange-600 ml-1">
                        ({product.reservedStock} rezerve)
                      </span>
                    )}
                  </p>
                )}
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                getStatusInfo(product.status).bg
              } ${getStatusInfo(product.status).color}`}>
                {getStatusLabel(product.status)}
              </span>
            </div>

            {/* Ürün durumu butonları */}
            <div className="flex gap-2 mt-3">
              {product.status === 'onay_bekliyor' && (
                <button
                  onClick={() => onProductStatusChange(order, product)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Üretime Al
                </button>
              )}
              
              {product.status === 'uretiliyor' && (
                <button
                  onClick={() => onCompleteProduction(order, product)}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                >
                  Üretimi Tamamla
                </button>
              )}
              
              {product.status === 'uretildi' && (
                <button
                  onClick={() => onProductStatusChange(order, product)}
                  className="px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
                >
                  Hazırla
                </button>
              )}
              
              {product.status === 'hazirlaniyor' && (
                <button
                  onClick={() => onProductStatusChange(order, product)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  Hazırlandı
                </button>
              )}
            </div>

            {/* Filament bilgileri */}
            {product.filaments && product.filaments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Filament Gereksinimleri:</p>
                <div className="flex flex-wrap gap-2">
                  {product.filaments.map((filament, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {filament.type} {filament.color} ({filament.weight}g)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
