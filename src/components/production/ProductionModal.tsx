// Üretim Modal Komponenti - Clean Code için ayrı component

import React, { useState, useEffect } from 'react';
import { OrderItem, OrderProduct, ProductionFormData, FilamentBobbin } from '@/types';
import { safeParseInt, safeParseFloat } from '@/utils/helpers';
import { apiGet } from '@/utils/api';

interface ProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ProductionFormData) => void;
  selectedOrderItem: OrderItem | null;
  selectedProduct: OrderProduct | null;
}

export const ProductionModal: React.FC<ProductionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedOrderItem,
  selectedProduct
}) => {
  const [formData, setFormData] = useState<ProductionFormData>({
    productionQuantity: 0,
    productionType: 'tabla',
    tableCount: 1,
    skipProduction: false,
    selectedFilamentBobins: []
  });
  
  const [filamentBobins, setFilamentBobins] = useState<FilamentBobbin[]>([]);
  const [showFilamentSelection, setShowFilamentSelection] = useState(false);
  const [isLoadingFilaments, setIsLoadingFilaments] = useState(false);

  // Form data'yı sıfırla
  useEffect(() => {
    if (isOpen && selectedProduct) {
      setFormData({
        productionQuantity: selectedProduct.quantity || 0,
        productionType: 'tabla',
        tableCount: 1,
        skipProduction: false,
        selectedFilamentBobins: []
      });
      setShowFilamentSelection(false);
    }
  }, [isOpen, selectedProduct]);

  // Filament bobinlerini yükle
  const loadFilamentBobins = async () => {
    setIsLoadingFilaments(true);
    try {
      const response = await apiGet<FilamentBobbin[]>('/api/filaments');
      if (response.success && response.data) {
        setFilamentBobins(response.data);
      }
    } catch (error) {
      console.error('Filament bobinleri yüklenirken hata:', error);
    } finally {
      setIsLoadingFilaments(false);
    }
  };

  // Üretim miktarı hesaplama
  useEffect(() => {
    if (!selectedProduct) return;

    if (formData.productionType === 'tabla') {
      const calculatedQuantity = (selectedProduct.capacity || 0) * formData.tableCount;
      const orderQuantity = selectedProduct.quantity || 0;
      const finalQuantity = Math.max(calculatedQuantity, orderQuantity);
      setFormData(prev => ({ ...prev, productionQuantity: finalQuantity }));
    } else if (formData.productionType === 'adet') {
      const orderQuantity = selectedProduct.quantity || 0;
      setFormData(prev => ({ 
        ...prev, 
        productionQuantity: Math.max(prev.productionQuantity, orderQuantity) 
      }));
    }
  }, [formData.productionType, formData.tableCount, selectedProduct]);

  // Filament bobin seçimi
  const handleBobinSelect = (filamentKey: string, bobinId: number) => {
    setFormData(prev => {
      const existing = prev.selectedFilamentBobins.find(item => item[filamentKey]);
      if (existing) {
        // Aynı filament tipi için bobin değiştir
        return {
          ...prev,
          selectedFilamentBobins: prev.selectedFilamentBobins.map(item => 
            item[filamentKey] ? { ...item, [filamentKey]: bobinId } : item
          )
        };
      } else {
        // Yeni filament tipi ekle
        return {
          ...prev,
          selectedFilamentBobins: [...prev.selectedFilamentBobins, { [filamentKey]: bobinId }]
        };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Eğer üretim yapılacaksa ve filament seçimi yapılmamışsa
    if (!formData.skipProduction && formData.selectedFilamentBobins.length === 0) {
      setShowFilamentSelection(true);
      loadFilamentBobins();
      return;
    }
    
    onConfirm(formData);
  };

  // Üretim Yap seçildiğinde filament seçimini göster
  useEffect(() => {
    if (!formData.skipProduction && selectedProduct?.filaments && selectedProduct.filaments.length > 0) {
      setShowFilamentSelection(true);
      loadFilamentBobins();
    } else {
      setShowFilamentSelection(false);
    }
  }, [formData.skipProduction, selectedProduct]);

  // Stoktan kullan seçildiğinde filament seçimini kapat
  useEffect(() => {
    if (formData.skipProduction) {
      setShowFilamentSelection(false);
    }
  }, [formData.skipProduction]);

  if (!isOpen || !selectedOrderItem || !selectedProduct) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedOrderItem.customerName === 'STOK' ? '🏭 Stok Üretimi' : '⚙️ Üretim Detayları'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        <form onSubmit={handleSubmit}>
          {/* Sipariş bilgileri */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">📊 Sipariş Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{selectedProduct.quantity || 0}</p>
                <p className="text-sm text-gray-600">Sipariş Miktarı</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{selectedProduct.availableStock || 0}</p>
                <p className="text-sm text-gray-600">Mevcut Stok</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{selectedProduct.reservedStock || 0}</p>
                <p className="text-sm text-gray-600">Rezerve Stok</p>
              </div>
            </div>
            
            {/* Stok durumu uyarısı */}
            {(selectedProduct.availableStock || 0) < (selectedProduct.quantity || 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                <p className="text-yellow-800 font-medium text-sm">⚠️ Dikkat!</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Mevcut stok ({selectedProduct.availableStock || 0} adet) sipariş miktarından ({selectedProduct.quantity || 0} adet) az. 
                  Üretim yapmanız önerilir.
                </p>
              </div>
            )}
            
            {(selectedProduct.availableStock || 0) >= (selectedProduct.quantity || 0) && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
                <p className="text-green-800 font-medium text-sm">✅ Yeterli Stok</p>
                <p className="text-green-700 text-sm mt-1">
                  Mevcut stok ({selectedProduct.availableStock || 0} adet) yeterli. 
                  Stoktan kullanabilir veya ek üretim yapabilirsiniz.
                </p>
              </div>
            )}
          </div>

          {/* Üretim tipi seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">🔧 Üretim Tipi</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`py-3 px-4 border-2 rounded-lg transition-all font-medium ${
                  formData.productionType === 'tabla' 
                    ? 'bg-green-500 text-white border-green-500 shadow-md' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-green-50'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, productionType: 'tabla' }))}
              >
                📦 Tabla
              </button>
              <button
                type="button"
                className={`py-3 px-4 border-2 rounded-lg transition-all font-medium ${
                  formData.productionType === 'adet' 
                    ? 'bg-green-500 text-white border-green-500 shadow-md' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-green-50'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, productionType: 'adet' }))}
              >
                🔢 Adet
              </button>
            </div>
          </div>

          {/* Üretim miktarı seçimi */}
          {formData.productionType === 'tabla' ? (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">📦 Tabla Sayısı</label>
              <input
                type="number"
                min="1"
                value={formData.tableCount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  tableCount: safeParseInt(e.target.value, 1) 
                }))}
                className="w-full border-2 border-gray-300 rounded-lg py-3 px-4 text-lg font-medium focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
              />
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Üretilecek miktar: {formData.productionQuantity} adet</span>
                  {formData.productionQuantity > (selectedProduct.capacity || 0) * formData.tableCount && (
                    <span className="text-orange-600 ml-2">
                      (Sipariş miktarı için otomatik artırıldı)
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">🔢 Üretim Miktarı</label>
              <input
                type="number"
                min={selectedProduct?.quantity || 1}
                value={formData.productionQuantity}
                onChange={(e) => {
                  const newQuantity = safeParseInt(e.target.value, 0);
                  const orderQuantity = selectedProduct?.quantity || 0;
                  setFormData(prev => ({ 
                    ...prev, 
                    productionQuantity: Math.max(newQuantity, orderQuantity) 
                  }));
                }}
                className="w-full border-2 border-gray-300 rounded-lg py-3 px-4 text-lg font-medium focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
              />
              <p className="mt-2 text-sm text-gray-600">
                Minimum: {selectedProduct?.quantity || 0} adet (sipariş miktarı)
              </p>
            </div>
          )}

          {/* Üretim tercihi seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">⚙️ Üretim Tercihi</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`py-4 px-4 border-2 rounded-lg transition-all font-medium ${
                  !formData.skipProduction 
                    ? 'bg-green-500 text-white border-green-500 shadow-md' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-300 hover:bg-green-50'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, skipProduction: false }))}
              >
                🏭 Üretim Yap
              </button>
              <button
                type="button"
                className={`py-4 px-4 border-2 rounded-lg transition-all font-medium ${
                  formData.skipProduction 
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, skipProduction: true }))}
              >
                📦 Stoktan Kullan
              </button>
            </div>
            
            {/* Stoktan kullan uyarısı */}
            {formData.skipProduction && (
              <div className="mt-2 bg-orange-50 border border-orange-200 rounded-md p-3">
                <p className="text-orange-800 font-medium text-sm">📦 Stoktan Kullan</p>
                <p className="text-orange-700 text-sm mt-1">
                  Mevcut stoktan teslim edilecek. Filament kullanılmayacak ve direkt "Hazırla" durumuna geçecek.
                </p>
                <div className="mt-2 text-xs text-orange-600">
                  <p>• Stok varsa: Stoktan düş, kalanı rezerve et</p>
                  <p>• Stok yoksa: Sadece rezerve et</p>
                </div>
              </div>
            )}
          </div>

          {/* Filament Seçimi */}
          {showFilamentSelection && (
            <div className="mb-6 border-2 border-blue-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
              <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center">
                🎨 Filament Bobin Seçimi
              </h3>
              
              {isLoadingFilaments ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Filament bobinleri yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedProduct.filaments?.map((filament, index) => {
                    const filamentKey = `${filament.type}-${filament.color}`;
                    const availableBobins = filamentBobins.filter(
                      bobin => bobin.type === filament.type && bobin.color === filament.color
                    );
                    
                    return (
                      <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: filament.color === 'Sarı' ? '#fbbf24' : filament.color === 'Açık Kırmızı' ? '#f87171' : '#6b7280' }}></span>
                          {filament.type} - {filament.color}
                        </h4>
                        
                        {availableBobins.length === 0 ? (
                          <div className="text-center py-6 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-red-600 font-medium">❌ Bu filament tipi için bobin bulunamadı!</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {availableBobins.map((bobin) => {
                              const isSelected = formData.selectedFilamentBobins.some(item => item[filamentKey] === bobin.id);
                              const remainingWeight = safeParseFloat(bobin.remainingWeight);
                              const totalWeight = safeParseFloat(bobin.totalWeight);
                              const usagePercent = totalWeight > 0 ? ((totalWeight - remainingWeight) / totalWeight) * 100 : 0;
                              const isFullyUsed = remainingWeight <= 0;
                              
                              return (
                                <div
                                  key={bobin.id}
                                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all transform hover:scale-105 ${
                                    isFullyUsed
                                      ? 'border-red-500 bg-red-50 opacity-60 cursor-not-allowed'
                                      : isSelected 
                                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                  }`}
                                  onClick={() => !isFullyUsed && handleBobinSelect(filamentKey, bobin.id)}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <p className="font-bold text-gray-900">{bobin.code}</p>
                                      <p className="text-sm text-gray-600">
                                        {remainingWeight}g / {totalWeight}g
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">✓</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-300 ${
                                          isFullyUsed 
                                            ? 'bg-gradient-to-r from-red-400 to-red-600' 
                                            : 'bg-gradient-to-r from-blue-400 to-blue-600'
                                        }`}
                                        style={{ width: `${usagePercent}%` }}
                                      />
                                    </div>
                                    <p className={`text-xs text-center ${
                                      isFullyUsed ? 'text-red-600 font-semibold' : 'text-gray-500'
                                    }`}>
                                      {isFullyUsed ? '❌ TÜKENDİ' : `%${usagePercent.toFixed(0)} kullanılmış`}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Butonlar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button 
              type="button"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors font-medium" 
              onClick={onClose}
            >
              İptal
            </button>
            <button 
              type="submit"
              className={`px-6 py-3 rounded-lg text-white font-medium transition-colors shadow-md hover:shadow-lg ${
                formData.skipProduction 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }`}
            >
              {formData.skipProduction ? '📦 Stoktan Kullan' : '🚀 Üretimi Başlat'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
