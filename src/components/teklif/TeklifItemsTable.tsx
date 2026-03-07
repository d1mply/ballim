'use client';

import type { QuoteItem, WholesalePricingMode } from '../../hooks/useTeklifCalculations';
import type { Product } from '../../hooks/useTeklifData';

interface TeklifItemsTableProps {
  quoteItems: QuoteItem[];
  products: Product[];
  wholesalePricingMode: WholesalePricingMode;
  wholesaleGramPrice: number;
  wholesaleDiscountRate: number;
  updateQuoteItem: (id: string, field: keyof QuoteItem, value: any) => void;
  removeQuoteItem: (id: string) => void;
}

export default function TeklifItemsTable({
  quoteItems, products, wholesalePricingMode, wholesaleGramPrice,
  updateQuoteItem, removeQuoteItem
}: TeklifItemsTableProps) {
  return (
    <div className="space-y-4">
      {quoteItems.map((item) => (
        <div key={item.id} className="bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Ürün</label>
              <select
                value={item.productId || ''}
                onChange={(e) => updateQuoteItem(item.id, 'productId', Number(e.target.value) || null)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Ürün Seçin</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.productType} ({product.capacity}gr)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Adet</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateQuoteItem(item.id, 'quantity', Number(e.target.value) || 1)}
                className="w-full px-3 py-2 border rounded-lg"
                min="1"
              />
            </div>

            <div className="text-sm">
              {item.productWeight > 0 && (
                <>
                  <div className="font-medium">Ağırlık: {item.productWeight}gr</div>
                  <div className="text-gray-600">Toplam: {item.productWeight * item.quantity}gr</div>
                </>
              )}
            </div>

            {wholesalePricingMode === 'discount' && (
              <div className="text-center">
                <div className="text-sm font-medium text-blue-600">Normal Fiyat</div>
                <div className="text-lg font-bold text-blue-700">{item.normalPrice.toFixed(2)}₺</div>
                <div className="text-xs text-gray-500">Aralık fiyatı</div>
              </div>
            )}

            {wholesalePricingMode === 'gram' && (
              <div className="text-center">
                <div className="text-sm font-medium text-green-600">Adet Fiyatı</div>
                <div className="text-lg font-bold text-green-700">
                  {(item.productWeight * wholesaleGramPrice).toFixed(2)}₺
                </div>
                <div className="text-xs text-gray-500">
                  {item.productWeight}gr × {wholesaleGramPrice}₺/gr
                </div>
              </div>
            )}

            <div className="text-center">
              <div className="text-sm font-medium text-purple-600">
                {wholesalePricingMode === 'discount' ? 'Toptancı (İskonto)' : 'Toplam Fiyat'}
              </div>
              <div className="text-lg font-bold text-purple-700">{item.wholesalePrice.toFixed(2)}₺</div>
              {wholesalePricingMode === 'gram' && (
                <div className="text-xs text-gray-500">{item.quantity} adet toplam</div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => removeQuoteItem(item.id)}
                className="text-red-600 hover:text-red-800"
              >
                🗑️ Sil
              </button>
            </div>
          </div>
        </div>
      ))}

      {quoteItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Ürün eklemek için &quot;Ürün Ekle&quot; butonuna tıklayın
        </div>
      )}
    </div>
  );
}
