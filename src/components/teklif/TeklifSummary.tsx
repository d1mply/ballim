'use client';

import type { QuoteItem, WholesalePricingMode, KdvType, Totals } from '../../hooks/useTeklifCalculations';
import type { PriceRange } from '../../hooks/useTeklifData';

interface TeklifSummaryProps {
  quoteItems: QuoteItem[];
  wholesalePricingMode: WholesalePricingMode;
  wholesaleDiscountRate: number;
  wholesaleGramPrice: number;
  kdvType: KdvType;
  totals: Totals;
  priceRanges: PriceRange[];
}

export default function TeklifSummary({
  quoteItems, wholesalePricingMode, wholesaleDiscountRate,
  wholesaleGramPrice, kdvType, totals, priceRanges
}: TeklifSummaryProps) {
  const { normalTotal, wholesaleTotal, totalWithKdv } = totals;

  return (
    <>
      {quoteItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-xl font-semibold mb-4">Toplam Fiyatlar</h3>

          {wholesalePricingMode === 'discount' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <h4 className="text-lg font-semibold text-blue-800 mb-2">Normal Fiyat</h4>
                <div className="text-3xl font-bold text-blue-900">{normalTotal.toFixed(2)}₺</div>
                <div className="text-sm text-blue-700 mt-2">Aralık fiyatı (iskonto öncesi)</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <h4 className="text-lg font-semibold text-purple-800 mb-2">İskonto Fiyatı</h4>
                <div className="text-3xl font-bold text-purple-900">{wholesaleTotal.toFixed(2)}₺</div>
                <div className="text-sm text-purple-700 mt-2">%{wholesaleDiscountRate} iskonto uygulandı</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <h4 className="text-lg font-semibold text-green-800 mb-2">KDV Bilgisi</h4>
                <div className="text-2xl font-bold text-green-900">
                  {kdvType === 'plus' ? '+KDV' : kdvType === 'included' ? 'KDV Dahil' : 'Faturasız'}
                </div>
                <div className="text-sm text-green-700 mt-2">
                  {kdvType === 'plus' ? 'KDV eklenecek' : kdvType === 'included' ? 'KDV dahil' : 'KDV yok'}
                </div>
                {kdvType === 'plus' && (
                  <div className="mt-2 text-lg font-bold text-green-800">
                    Toplam: {totalWithKdv.toFixed(2)}₺
                  </div>
                )}
              </div>
            </div>
          )}

          {wholesalePricingMode === 'gram' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <h4 className="text-lg font-semibold text-blue-800 mb-2">Adet Fiyatı</h4>
                <div className="text-3xl font-bold text-blue-900">
                  {quoteItems.length > 0 && quoteItems[0].productWeight
                    ? (quoteItems[0].productWeight * wholesaleGramPrice).toFixed(2)
                    : (20 * wholesaleGramPrice).toFixed(2)}₺
                </div>
                <div className="text-sm text-blue-700 mt-2">
                  {quoteItems.length > 0 && quoteItems[0].productWeight
                    ? `${quoteItems[0].productWeight}gr × ${wholesaleGramPrice}₺/gr`
                    : `${wholesaleGramPrice}₺/gr sabit fiyat`}
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <h4 className="text-lg font-semibold text-green-800 mb-2">Toplam Fiyat</h4>
                <div className="text-3xl font-bold text-green-900">{wholesaleTotal.toFixed(2)}₺</div>
                <div className="text-sm text-green-700 mt-2">
                  {quoteItems.reduce((sum, item) => sum + item.quantity, 0)} adet toplam
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                <h4 className="text-lg font-semibold text-orange-800 mb-2">KDV Bilgisi</h4>
                <div className="text-2xl font-bold text-orange-900">
                  {kdvType === 'plus' ? '+KDV' : kdvType === 'included' ? 'KDV Dahil' : 'Faturasız'}
                </div>
                <div className="text-sm text-orange-700 mt-2">
                  {kdvType === 'plus' ? 'KDV eklenecek' : kdvType === 'included' ? 'KDV dahil' : 'KDV yok'}
                </div>
                {kdvType === 'plus' && (
                  <div className="mt-2 text-lg font-bold text-orange-800">
                    Toplam: {totalWithKdv.toFixed(2)}₺
                  </div>
                )}
              </div>
            </div>
          )}

          {wholesalePricingMode === 'discount' && normalTotal > 0 && wholesaleTotal > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <div className="text-lg font-semibold text-gray-700">
                Fiyat Farkı: {(normalTotal - wholesaleTotal).toFixed(2)}₺
              </div>
              <div className="text-sm text-gray-600">
                Toptancı fiyatı %{(((normalTotal - wholesaleTotal) / normalTotal) * 100).toFixed(1)} daha uygun
              </div>
            </div>
          )}
        </div>
      )}

      {wholesalePricingMode === 'discount' && priceRanges.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">📊 Fiyat Aralıkları</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priceRanges.map(range => (
              <div key={range.id} className="bg-gray-50 border rounded-lg p-3">
                <div className="font-medium">{range.minGram}-{range.maxGram}gr</div>
                <div className="text-lg font-bold text-purple-600">{range.price}₺</div>
                <div className="text-sm text-gray-600">
                  %{wholesaleDiscountRate} indirimle: {(range.price * (1 - wholesaleDiscountRate / 100)).toFixed(2)}₺
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
