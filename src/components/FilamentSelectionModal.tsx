'use client';

import { useState, useEffect } from 'react';
import { Icons } from '../utils/Icons';

// Filament bobin tipi
interface FilamentBobbin {
  id: number;
  code: string;
  name: string;
  type: string;
  brand: string;
  color: string;
  remainingWeight: number;
  totalWeight: number;
}

// Ürün filament tipi
interface ProductFilament {
  type: string;
  color: string;
  brand: string;
  weight: number;
}

// Modal props tipi
interface FilamentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedBobins: { [key: string]: number }[]) => void;
  productFilaments: ProductFilament[];
  productName: string;
  productCode: string;
}

export default function FilamentSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  productFilaments,
  productName,
  productCode
}: FilamentSelectionModalProps) {
  const [availableBobins, setAvailableBobins] = useState<{ [key: string]: FilamentBobbin[] }>({});
  const [selectedBobins, setSelectedBobins] = useState<{ [key: string]: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filament bobinlerini yükle
  useEffect(() => {
    if (isOpen && productFilaments.length > 0) {
      fetchAvailableBobins();
    }
  }, [isOpen, productFilaments]);

  // Mevcut filament bobinlerini getir
  const fetchAvailableBobins = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/filaments');
      if (!response.ok) {
        throw new Error('Filament verileri yüklenemedi');
      }

      const allBobins: FilamentBobbin[] = await response.json();
      
      // Her filament türü için uygun bobinleri grupla
      const groupedBobins: { [key: string]: FilamentBobbin[] } = {};
      
      productFilaments.forEach(filament => {
        const key = `${filament.type}-${filament.color}`;
        const matchingBobins = allBobins.filter(bobbin => 
          bobbin.type === filament.type && 
          bobbin.color === filament.color &&
          bobbin.remainingWeight >= filament.weight // Yeterli miktarda olanlar
        );
        
        groupedBobins[key] = matchingBobins.sort((a, b) => b.remainingWeight - a.remainingWeight);
      });

      setAvailableBobins(groupedBobins);
      
      // Varsayılan seçimleri ayarla
      const defaultSelections: { [key: string]: number }[] = [];
      productFilaments.forEach(filament => {
        const key = `${filament.type}-${filament.color}`;
        const bobins = groupedBobins[key];
        if (bobins.length > 0) {
          // En çok miktarda olan bobini varsayılan olarak seç
          defaultSelections.push({ [key]: bobins[0].id });
        }
      });
      
      setSelectedBobins(defaultSelections);
    } catch (err) {
      console.error('Filament bobinleri yüklenirken hata:', err);
      setError('Filament bobinleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Bobin seçimini güncelle
  const handleBobbinSelection = (filamentKey: string, bobbinId: number) => {
    setSelectedBobins(prev => {
      const newSelections = prev.filter(selection => !selection[filamentKey]);
      newSelections.push({ [filamentKey]: bobbinId });
      return newSelections;
    });
  };

  // Onaylama
  const handleConfirm = () => {
    // Tüm filamentler için bobin seçilmiş mi kontrol et
    const allSelected = productFilaments.every(filament => {
      const key = `${filament.type}-${filament.color}`;
      return selectedBobins.some(selection => selection[key]);
    });

    if (!allSelected) {
      alert('Lütfen tüm filamentler için bobin seçimi yapın');
      return;
    }

    onConfirm(selectedBobins);
  };

  // Modal kapalıysa render etme
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          {/* Başlık */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">Filament Bobin Seçimi</h3>
              <p className="text-muted-foreground mt-1">
                {productCode} - {productName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icons.XIcon className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Filament bobinleri yükleniyor...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
              <p className="text-red-700">{error}</p>
              <button
                onClick={fetchAvailableBobins}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          ) : productFilaments.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-8 text-center">
              <Icons.AlertTriangleIcon className="w-12 h-12 mx-auto text-yellow-600 mb-4" />
              <h4 className="text-lg font-medium text-yellow-900 mb-2">Filament Bilgisi Bulunamadı</h4>
              <p className="text-yellow-700 mb-4">
                Bu ürün için filament bilgisi tanımlanmamış. Üretim modalına yönlendiriliyorsunuz.
              </p>
              <button
                onClick={() => onConfirm([])}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Devam Et
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filament Listesi */}
              {productFilaments.map((filament, index) => {
                const key = `${filament.type}-${filament.color}`;
                const bobins = availableBobins[key] || [];
                const selectedBobbinId = selectedBobins.find(selection => selection[key])?.[key];
                const selectedBobbin = bobins.find(bobbin => bobbin.id === selectedBobbinId);

                return (
                  <div key={key} className="border border-border rounded-lg p-4">
                    {/* Filament Başlığı */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0"
                          style={{ backgroundColor: getColorHex(filament.color) }}
                        ></div>
                        <div>
                          <h4 className="font-medium text-lg">
                            {filament.type} - {filament.color}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Gerekli: {filament.weight}g
                          </p>
                        </div>
                      </div>
                      
                      {/* Stok Durumu */}
                      <div className="flex items-center space-x-2 px-3 py-2 rounded-md border ${
                        bobins.length > 0 
                          ? 'text-green-600 bg-green-50 border-green-200' 
                          : 'text-red-600 bg-red-50 border-red-200'
                      }">
                        {bobins.length > 0 ? (
                          <>
                            <Icons.CheckIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">Yeterli stok mevcut</span>
                          </>
                        ) : (
                          <>
                            <Icons.XIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">Yetersiz stok</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bobin Seçenekleri */}
                    {bobins.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bobins.map((bobbin) => {
                          const isSelected = selectedBobbinId === bobbin.id;
                          const isSufficient = bobbin.remainingWeight >= filament.weight;
                          
                          return (
                            <div
                              key={bobbin.id}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                                isSelected 
                                  ? 'border-primary bg-primary/5 shadow-md' 
                                  : 'border-border hover:border-primary/50 hover:bg-gray-50'
                              } ${!isSufficient ? 'opacity-60' : ''}`}
                              onClick={() => isSufficient && handleBobbinSelection(key, bobbin.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{bobbin.code}</span>
                                {isSelected && (
                                  <Icons.CheckIcon className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Marka:</span>
                                  <span>{bobbin.brand}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Toplam:</span>
                                  <span>{bobbin.totalWeight}g</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Kalan:</span>
                                  <span className={bobbin.remainingWeight < filament.weight ? 'text-red-600' : 'text-green-600'}>
                                    {bobbin.remainingWeight}g
                                  </span>
                                </div>
                              </div>

                              {!isSufficient && (
                                <div className="mt-2 text-xs text-red-600 text-center">
                                  Yetersiz miktar
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                        <p className="text-red-700">
                          Bu filament için yeterli miktarda bobin bulunamadı.
                        </p>
                        <p className="text-red-600 text-sm mt-1">
                          Gerekli: {filament.weight}g | Mevcut: {bobins.reduce((sum, b) => sum + b.remainingWeight, 0)}g
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Seçim Özeti */}
              {selectedBobins.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-3 text-lg">Seçilen Bobinler:</h4>
                  <div className="space-y-3">
                    {productFilaments.map((filament) => {
                      const key = `${filament.type}-${filament.color}`;
                      const selectedBobbinId = selectedBobins.find(selection => selection[key])?.[key];
                      const selectedBobbin = availableBobins[key]?.find(bobbin => bobbin.id === selectedBobbinId);
                      
                      if (!selectedBobbin) return null;
                      
                      return (
                        <div key={key} className="flex items-center justify-between p-3 bg-blue-100 rounded-md">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-blue-300"
                              style={{ backgroundColor: getColorHex(filament.color) }}
                            ></div>
                            <span className="text-blue-800 font-medium">
                              {filament.type} - {filament.color} ({filament.weight}g)
                            </span>
                          </div>
                          <span className="font-semibold text-blue-900">
                            {selectedBobbin.code} (kalan: {selectedBobbin.remainingWeight}g)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Aksiyon Butonları */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-border rounded-md hover:bg-muted transition-colors font-medium"
                >
                  İptal
                </button>
                                 <button
                   onClick={handleConfirm}
                   disabled={selectedBobins.length !== productFilaments.length}
                   className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
                 >
                   Filament Seçimini Onayla
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Renk hex kodlarını döndüren yardımcı fonksiyon
function getColorHex(color: string): string {
  const colorMap: { [key: string]: string } = {
    'Siyah': '#000000',
    'Beyaz': '#FFFFFF',
    'Kırmızı': '#FF0000',
    'KÄ±rmÄ±zÄ±': '#FF0000', // API'den gelen bozuk karakterler için
    'Mavi': '#0000FF',
    'Yeşil': '#00FF00',
    'Sarı': '#FFFF00',
    'Turuncu': '#FFA500',
    'Mor': '#800080',
    'Pembe': '#FFC0CB',
    'Kahverengi': '#A52A2A',
    'Gri': '#808080',
    'Altın': '#FFD700',
    'Gümüş': '#C0C0C0'
  };
  
  return colorMap[color] || '#CCCCCC';
}
