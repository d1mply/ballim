'use client';

import { Icons } from '../../utils/Icons';
import { PriceRange, PriceRangeForm } from '../../hooks/usePriceRanges';

interface PriceRangesPanelProps {
  priceRanges: PriceRange[];
  showPriceRanges: boolean;
  setShowPriceRanges: (show: boolean) => void;
  priceRangeForm: PriceRangeForm;
  editingPriceRange: PriceRange | null;
  handlePriceRangeFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePriceRangeSave: () => Promise<void>;
  handlePriceRangeEdit: (priceRange: PriceRange) => void;
  handlePriceRangeDelete: (id: number) => Promise<void>;
  resetPriceRangeForm: () => void;
}

export default function PriceRangesPanel({
  priceRanges, showPriceRanges, setShowPriceRanges,
  priceRangeForm, editingPriceRange,
  handlePriceRangeFormChange, handlePriceRangeSave,
  handlePriceRangeEdit, handlePriceRangeDelete, resetPriceRangeForm,
}: PriceRangesPanelProps) {
  return (
    <div className="border-b pb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Toptancı Fiyat Aralıkları</h2>
        <button
          onClick={() => setShowPriceRanges(!showPriceRanges)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {showPriceRanges ? 'Gizle' : 'Göster'}
        </button>
      </div>

      {showPriceRanges && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">
              {editingPriceRange ? 'Fiyat Aralığını Düzenle' : 'Yeni Fiyat Aralığı Ekle'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Gram</label>
                <input
                  type="number"
                  name="minGram"
                  value={priceRangeForm.minGram}
                  onChange={handlePriceRangeFormChange}
                  placeholder="0"
                  className="w-full border border-border rounded-md py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Gram</label>
                <input
                  type="number"
                  name="maxGram"
                  value={priceRangeForm.maxGram}
                  onChange={handlePriceRangeFormChange}
                  placeholder="15"
                  className="w-full border border-border rounded-md py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fiyat (₺)</label>
                <input
                  type="number"
                  name="price"
                  value={priceRangeForm.price}
                  onChange={handlePriceRangeFormChange}
                  placeholder="25"
                  step="0.01"
                  className="w-full border border-border rounded-md py-2 px-3"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handlePriceRangeSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {editingPriceRange ? 'Güncelle' : 'Ekle'}
                </button>
                {editingPriceRange && (
                  <button
                    onClick={resetPriceRangeForm}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    İptal
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Gram Aralığı</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Fiyat</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Durum</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {priceRanges.length > 0 ? (
                    priceRanges.map((range) => (
                      <tr key={range.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {range.minGram}gr - {range.maxGram}gr
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {range.price}₺
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            range.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {range.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handlePriceRangeEdit(range)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                              title="Düzenle"
                            >
                              <Icons.EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePriceRangeDelete(range.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                              title="Sil"
                            >
                              <Icons.TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Henüz fiyat aralığı tanımlanmamış
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
