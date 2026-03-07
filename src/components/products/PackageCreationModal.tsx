'use client';

import React from 'react';
import { Icons } from '../../utils/Icons';

export interface PackageCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageStep: 1 | 2 | 3;
  setPackageStep: (step: 1 | 2 | 3) => void;
  packageName: string;
  setPackageName: (v: string) => void;
  packagePrice: number;
  setPackagePrice: (v: number) => void;
  packageDescription: string;
  setPackageDescription: (v: string) => void;
  targetWeightGram: number;
  setTargetWeightGram: (v: number) => void;
  tolerancePercent: number;
  setTolerancePercent: (v: number) => void;
  contentMode: 'variety' | 'rows';
  setContentMode: (v: 'variety' | 'rows') => void;
  varietyCount: number;
  setVarietyCount: (v: number) => void;
  quantityPerVariety: number;
  setQuantityPerVariety: (v: number) => void;
  varietyProductIds: string[];
  setVarietyProductIds: (v: string[]) => void;
  packageItems: Array<{ productId: string; quantity: number }>;
  setPackageItems: (v: Array<{ productId: string; quantity: number }>) => void;
  forceCreateOutOfTolerance: boolean;
  setForceCreateOutOfTolerance: (v: boolean) => void;
  isPackageSubmitting: boolean;
  onSubmit: () => void;
  packageItemsForApi: Array<{ productId: number; quantity: number }>;
  packageTotalGram: number;
  toleranceMin: number;
  toleranceMax: number;
  isWithinTolerance: boolean;
  hasPackageContent: boolean;
  productsList: Array<{ id: string; code: string; productType: string; pieceGram?: number; availableStock?: number }>;
}

export default function PackageCreationModal(props: PackageCreationModalProps): React.ReactElement {
  const {
    isOpen,
    onClose,
    packageStep,
    setPackageStep,
    packageName,
    setPackageName,
    packagePrice,
    setPackagePrice,
    packageDescription,
    setPackageDescription,
    targetWeightGram,
    setTargetWeightGram,
    tolerancePercent,
    setTolerancePercent,
    contentMode,
    setContentMode,
    varietyCount,
    setVarietyCount,
    quantityPerVariety,
    setQuantityPerVariety,
    varietyProductIds,
    setVarietyProductIds,
    packageItems,
    setPackageItems,
    forceCreateOutOfTolerance,
    setForceCreateOutOfTolerance,
    isPackageSubmitting,
    onSubmit,
    packageItemsForApi,
    packageTotalGram,
    toleranceMin,
    toleranceMax,
    isWithinTolerance,
    hasPackageContent,
    productsList,
  } = props;

  if (!isOpen) return <></>;

  const handleVarietyCountChange = (n: number) => {
    const val = Math.max(1, n);
    setVarietyCount(val);
    setVarietyProductIds((prev) => prev.slice(0, val).concat(Array(Math.max(0, val - prev.length)).fill('')));
  };

  const getPieceGram = (p: { pieceGram?: number }) => Number(p?.pieceGram) || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Yeni Paket Oluştur</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={isPackageSubmitting}>
              <Icons.XIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            <span className={`px-3 py-1 rounded ${packageStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-gray-200'}`}>1. Hedef</span>
            <span className={`px-3 py-1 rounded ${packageStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-gray-200'}`}>2. İçerik</span>
            <span className={`px-3 py-1 rounded ${packageStep === 3 ? 'bg-primary text-primary-foreground' : 'bg-gray-200'}`}>3. Onay</span>
          </div>

          {packageStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Paket Adı *</label>
                <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Örn: Anahtarlık Standı Seti" disabled={isPackageSubmitting} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Hedef toplam ağırlık (g) *</label>
                  <input type="number" min="1" value={targetWeightGram || ''} onChange={(e) => setTargetWeightGram(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="300" disabled={isPackageSubmitting} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Tolerans (%)</label>
                  <input type="number" min="0" max="100" value={tolerancePercent ?? ''} onChange={(e) => setTolerancePercent(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="10" disabled={isPackageSubmitting} />
                  <p className="text-xs text-gray-500 mt-1">Kabul aralığı: {Math.round(toleranceMin)}–{Math.round(toleranceMax)}g</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Paket Fiyatı (₺) *</label>
                <input type="number" min="0" step="0.01" value={packagePrice || ''} onChange={(e) => setPackagePrice(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="750" disabled={isPackageSubmitting} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Açıklama (Opsiyonel)</label>
                <textarea value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Paket hakkında açıklama..." disabled={isPackageSubmitting} />
              </div>
              <div className="flex justify-end pt-4">
                <button type="button" onClick={() => setPackageStep(2)} disabled={!packageName || targetWeightGram <= 0 || packagePrice <= 0} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">İleri</button>
              </div>
            </div>
          )}

          {packageStep === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-gray-200 pb-2">
                <button type="button" onClick={() => setContentMode('variety')} className={`px-3 py-1 rounded ${contentMode === 'variety' ? 'bg-primary text-primary-foreground' : 'bg-gray-100'}`}>Çeşit × Adet</button>
                <button type="button" onClick={() => setContentMode('rows')} className={`px-3 py-1 rounded ${contentMode === 'rows' ? 'bg-primary text-primary-foreground' : 'bg-gray-100'}`}>Satır satır</button>
              </div>
              {contentMode === 'variety' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Çeşit sayısı</label>
                      <input type="number" min="1" value={varietyCount || ''} onChange={(e) => handleVarietyCountChange(parseInt(e.target.value, 10) || 1)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" disabled={isPackageSubmitting} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Her birinden adet</label>
                      <input type="number" min="1" value={quantityPerVariety || ''} onChange={(e) => setQuantityPerVariety(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" disabled={isPackageSubmitting} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Ürünler ({varietyCount} çeşit seçin)</label>
                    <div className="space-y-2">
                      {Array.from({ length: varietyCount }).map((_, i) => {
                        const p = productsList.find((x) => x.id === varietyProductIds[i]);
                        const stock = p?.availableStock ?? 0;
                        const need = quantityPerVariety;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 w-8">{i + 1}.</span>
                            <select value={varietyProductIds[i] || ''} onChange={(e) => { const v = [...varietyProductIds]; v[i] = e.target.value; setVarietyProductIds(v); }} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" disabled={isPackageSubmitting}>
                              <option value="">Ürün seçin...</option>
                              {productsList.map((prod) => (
                                <option key={prod.id} value={prod.id} disabled={varietyProductIds.filter((id) => id === prod.id).length >= 1 && varietyProductIds[i] !== prod.id}>{prod.code} - {prod.productType} ({getPieceGram(prod)}g/adet)</option>
                              ))}
                            </select>
                            {varietyProductIds[i] && (stock < need ? <span className="text-red-600 text-sm">Stok: {stock} &lt; {need}</span> : <span className="text-gray-500 text-sm">Stok: {stock}</span>)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              {contentMode === 'rows' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold mb-2">Paket İçindeki Ürünler *</label>
                  {packageItems.map((item, index) => {
                    const product = productsList.find((p) => p.id === item.productId);
                    const pieceGram = product ? getPieceGram(product) : 0;
                    const stock = product?.availableStock ?? 0;
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <select value={item.productId} onChange={(e) => { const newItems = [...packageItems]; newItems[index].productId = e.target.value; setPackageItems(newItems); }} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" disabled={isPackageSubmitting}>
                          <option value="">Ürün seçin...</option>
                          {productsList.map((prod) => (
                            <option key={prod.id} value={prod.id}>{prod.code} - {prod.productType} ({getPieceGram(prod)}g)</option>
                          ))}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={(e) => { const newItems = [...packageItems]; newItems[index].quantity = parseInt(e.target.value, 10) || 1; setPackageItems(newItems); }} className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" disabled={isPackageSubmitting} />
                        <button type="button" onClick={() => setPackageItems(packageItems.filter((_, i) => i !== index))} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" disabled={isPackageSubmitting}><Icons.TrashIcon className="w-5 h-5" /></button>
                        {product && <span className={`text-sm ${stock < item.quantity ? 'text-red-600' : 'text-gray-600'}`}>Stok: {stock} {stock < item.quantity && `< ${item.quantity}`}</span>}
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => setPackageItems([...packageItems, { productId: '', quantity: 1 }])} className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-gray-600 hover:text-primary" disabled={isPackageSubmitting}><Icons.PlusIcon className="w-5 h-5 inline mr-2" /> Ürün Ekle</button>
                </div>
              )}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Toplam: <strong>{Math.round(packageTotalGram)}g</strong> (hedef {targetWeightGram}g, aralık {Math.round(toleranceMin)}–{Math.round(toleranceMax)}g) {hasPackageContent && (isWithinTolerance ? <span className="text-green-600"> – Tolerans içinde</span> : <span className="text-amber-600"> – Tolerans dışı</span>)}</p>
              </div>
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setPackageStep(1)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Geri</button>
                <button type="button" onClick={() => setPackageStep(3)} disabled={!hasPackageContent} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">İleri</button>
              </div>
            </div>
          )}

          {packageStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p><strong>Paket adı:</strong> {packageName}</p>
                <p><strong>Hedef:</strong> {targetWeightGram}g, <strong>Tolerans:</strong> ±{tolerancePercent}%</p>
                <p><strong>Hesaplanan toplam:</strong> {Math.round(packageTotalGram)}g {!isWithinTolerance && <span className="text-amber-600">(tolerans dışı)</span>}</p>
                <p><strong>Fiyat:</strong> {packagePrice}₺</p>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <p className="font-semibold mb-2">İçerik:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {packageItemsForApi.map((item, idx) => {
                      const p = productsList.find((x) => String(x.id) === String(item.productId));
                      const pieceGram = p ? getPieceGram(p) : 0;
                      return <li key={idx}>{p ? `${p.code} - ${p.productType}` : String(item.productId)}: {item.quantity} adet ({(pieceGram * item.quantity)}g)</li>;
                    })}
                  </ul>
                </div>
              </div>
              {!isWithinTolerance && (
                <label className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <input type="checkbox" checked={forceCreateOutOfTolerance} onChange={(e) => setForceCreateOutOfTolerance(e.target.checked)} />
                  <span className="text-amber-800">Toplam {Math.round(packageTotalGram)}g, hedef {targetWeightGram}g ±{tolerancePercent}% dışında. Yine de oluştur</span>
                </label>
              )}
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setPackageStep(2)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Geri</button>
                <button type="button" disabled={isPackageSubmitting || (!isWithinTolerance && !forceCreateOutOfTolerance)} onClick={onSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isPackageSubmitting ? 'Oluşturuluyor...' : 'Paket Oluştur'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
