'use client';

import Layout from '../../components/Layout';
import { useTeklifData } from '../../hooks/useTeklifData';
import { useTeklifCalculations } from '../../hooks/useTeklifCalculations';
import { exportToPDF } from '../../utils/teklifPdfExport';
import TeklifSettings from '../../components/teklif/TeklifSettings';
import TeklifItemsTable from '../../components/teklif/TeklifItemsTable';
import TeklifSummary from '../../components/teklif/TeklifSummary';

export default function TeklifPage() {
  const { products, filamentTypes, priceRanges } = useTeklifData();

  const {
    quoteItems, quoteNumber, setQuoteNumber,
    wholesalePricingMode, setWholesalePricingMode,
    wholesaleDiscountRate, setWholesaleDiscountRate,
    wholesaleGramPrice, setWholesaleGramPrice,
    kdvType, setKdvType,
    addQuoteItem, updateQuoteItem, removeQuoteItem,
    getTotals
  } = useTeklifCalculations({ products, filamentTypes, priceRanges });

  const totals = getTotals();

  const handleExportPdf = (isProforma: boolean) => {
    exportToPDF({
      quoteItems, quoteNumber,
      wholesalePricingMode, wholesaleDiscountRate, wholesaleGramPrice, kdvType,
      normalTotal: totals.normalTotal,
      wholesaleTotal: totals.wholesaleTotal,
      basePrice: totals.basePrice,
      kdvAmount: totals.kdvAmount,
      totalWithKdv: totals.totalWithKdv
    }, isProforma);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Teklif Hesaplama</h1>
            <p className="text-gray-600">Basit ve güvenilir fiyat hesaplama</p>
          </div>

          <TeklifSettings
            quoteNumber={quoteNumber}
            setQuoteNumber={setQuoteNumber}
            wholesalePricingMode={wholesalePricingMode}
            setWholesalePricingMode={setWholesalePricingMode}
            wholesaleDiscountRate={wholesaleDiscountRate}
            setWholesaleDiscountRate={setWholesaleDiscountRate}
            wholesaleGramPrice={wholesaleGramPrice}
            setWholesaleGramPrice={setWholesaleGramPrice}
            kdvType={kdvType}
            setKdvType={setKdvType}
            onAddItem={addQuoteItem}
            onExportPdf={() => handleExportPdf(false)}
            onExportProforma={() => handleExportPdf(true)}
            hasItems={quoteItems.length > 0}
          />

          <TeklifItemsTable
            quoteItems={quoteItems}
            products={products}
            wholesalePricingMode={wholesalePricingMode}
            wholesaleGramPrice={wholesaleGramPrice}
            wholesaleDiscountRate={wholesaleDiscountRate}
            updateQuoteItem={updateQuoteItem}
            removeQuoteItem={removeQuoteItem}
          />

          <TeklifSummary
            quoteItems={quoteItems}
            wholesalePricingMode={wholesalePricingMode}
            wholesaleDiscountRate={wholesaleDiscountRate}
            wholesaleGramPrice={wholesaleGramPrice}
            kdvType={kdvType}
            totals={totals}
            priceRanges={priceRanges}
          />
        </div>
      </div>
    </Layout>
  );
}
