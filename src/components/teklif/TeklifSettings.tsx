'use client';

import type { WholesalePricingMode, KdvType } from '../../hooks/useTeklifCalculations';

interface TeklifSettingsProps {
  quoteNumber: string;
  setQuoteNumber: (v: string) => void;
  wholesalePricingMode: WholesalePricingMode;
  setWholesalePricingMode: (v: WholesalePricingMode) => void;
  wholesaleDiscountRate: number;
  setWholesaleDiscountRate: (v: number) => void;
  wholesaleGramPrice: number;
  setWholesaleGramPrice: (v: number) => void;
  kdvType: KdvType;
  setKdvType: (v: KdvType) => void;
  onAddItem: () => void;
  onExportPdf: () => void;
  onExportProforma: () => void;
  hasItems: boolean;
}

export default function TeklifSettings({
  quoteNumber, setQuoteNumber,
  wholesalePricingMode, setWholesalePricingMode,
  wholesaleDiscountRate, setWholesaleDiscountRate,
  wholesaleGramPrice, setWholesaleGramPrice,
  kdvType, setKdvType,
  onAddItem, onExportPdf, onExportProforma, hasItems
}: TeklifSettingsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="text-sm font-medium mr-2">Teklif No:</label>
          <input
            type="text"
            value={quoteNumber}
            onChange={(e) => setQuoteNumber(e.target.value)}
            className="w-32 px-3 py-1 border rounded-lg text-center font-medium"
            placeholder="TK-001"
          />
        </div>

        <div>
          <label className="text-sm font-medium mr-2">Toptancı Fiyatlama:</label>
          <select
            value={wholesalePricingMode}
            onChange={(e) => setWholesalePricingMode(e.target.value as WholesalePricingMode)}
            className="px-3 py-1 border rounded"
          >
            <option value="discount">İskonto Sistemi</option>
            <option value="gram">Gram Başı Fiyat</option>
          </select>
        </div>

        {wholesalePricingMode === 'discount' && (
          <div>
            <label className="text-sm font-medium mr-2">İskonto Oranı:</label>
            <input
              type="number"
              value={wholesaleDiscountRate}
              onChange={(e) => setWholesaleDiscountRate(Number(e.target.value))}
              className="w-20 px-2 py-1 border rounded text-center"
              min="0"
              max="100"
            />
            <span className="ml-1 text-sm">%</span>
          </div>
        )}

        {wholesalePricingMode === 'gram' && (
          <div>
            <label className="text-sm font-medium mr-2">Gram Başı Fiyat:</label>
            <input
              type="number"
              step="0.1"
              value={wholesaleGramPrice}
              onChange={(e) => setWholesaleGramPrice(Number(e.target.value))}
              className="w-20 px-2 py-1 border rounded text-center"
              min="0"
            />
            <span className="ml-1 text-sm">₺/gr</span>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">KDV:</label>
          <select
            value={kdvType}
            onChange={(e) => setKdvType(e.target.value as KdvType)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="plus">+KDV</option>
            <option value="included">KDV Dahil</option>
            <option value="no-invoice">Faturasız</option>
          </select>
        </div>

        <button
          onClick={onAddItem}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Ürün Ekle
        </button>

        {hasItems && (
          <>
            <button
              onClick={onExportPdf}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              📄 PDF İndir
            </button>
            <button
              onClick={onExportProforma}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              📋 Proforma Fatura
            </button>
          </>
        )}
      </div>
    </div>
  );
}
