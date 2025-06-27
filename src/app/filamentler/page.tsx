'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon } from '@/utils/Icons';
import FilamentModal, { FilamentData } from '@/components/FilamentModal';
import StockAddModal, { StockAddData } from '@/components/StockAddModal';

// Örnek başlangıç verileri
const initialFilaments: FilamentData[] = [
  {
    id: 'PLA-BLK-001',
    code: 'PLA-BLK-001',
    name: 'PLA Siyah',
    type: 'PLA',
    brand: 'Creality',
    color: 'Siyah',
    location: 'Raf-A1',
    totalWeight: 1000,
    remainingWeight: 750,
    quantity: 5,
    criticalStock: 200,
    tempRange: '190-220°C',
    cap: '1.75 mm',
    pricePerGram: 2.5
  },
  {
    id: 'PETG-RED-001',
    code: 'PETG-RED-001',
    name: 'PETG Kırmızı',
    type: 'PETG',
    brand: 'Prusament',
    color: 'Kırmızı',
    location: 'Raf-B2',
    totalWeight: 1000,
    remainingWeight: 1000,
    quantity: 3,
    criticalStock: 250,
    tempRange: '230-250°C',
    cap: '1.75 mm',
    pricePerGram: 3.2
  },
  {
    id: 'PLA-WHT-001',
    code: 'PLA-WHT-001',
    name: 'PLA Beyaz',
    type: 'PLA',
    brand: 'eSun',
    color: 'Beyaz',
    location: 'Raf-A2',
    totalWeight: 1000,
    remainingWeight: 250,
    quantity: 2,
    criticalStock: 300,
    tempRange: '190-220°C',
    cap: '1.75 mm',
    pricePerGram: 2.3
  }
];

export default function FilamentlerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filamentsList, setFilamentsList] = useState<FilamentData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilament, setSelectedFilament] = useState<FilamentData | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stok ekleme modal state'leri
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedFilamentForStock, setSelectedFilamentForStock] = useState<FilamentData | null>(null);
  
  // Veritabanından filament verilerini yükle
  useEffect(() => {
    const fetchFilaments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/filaments');
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Veri varsa göster, yoksa boş liste göster
        if (Array.isArray(data)) {
          setFilamentsList(data);
        } else {
          console.log('Filament verisi bulunamadı, boş liste gösteriliyor');
          setFilamentsList([]);
        }
      } catch (err) {
        console.error('Filament verilerini getirirken hata:', err);
        setError('Filament verileri yüklenirken bir hata oluştu.');
        // Hata durumunda boş liste göster
        setFilamentsList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilaments();
  }, []);
  
  // Filament tipleri ve ilişkilerini API'den al
  useEffect(() => {
    if (filamentsList.length > 0) {
      try {
        // Filament tiplerini topla ve benzersiz olarak belirle
        const allTypes = filamentsList.map(f => f.type).filter(Boolean);
        const uniqueTypes = Array.from(new Set(allTypes));
        
        // Marka-tip ilişkisini belirle
        const typeToMarcaMap: Record<string, Set<string>> = {};
        // Marka-renk ilişkisini belirle
        const marcaToColorMap: Record<string, Set<string>> = {};
        
        filamentsList.forEach(f => {
          if (f.type && f.brand) {
            // Tip bazında markaları belirle
            if (!typeToMarcaMap[f.type]) {
              typeToMarcaMap[f.type] = new Set();
            }
            typeToMarcaMap[f.type].add(f.brand);
            
            // Marka bazında renkleri belirle
            const marcaKey = `${f.type}-${f.brand}`;
            if (!marcaToColorMap[marcaKey]) {
              marcaToColorMap[marcaKey] = new Set();
            }
            if (f.color) {
              marcaToColorMap[marcaKey].add(f.color);
            }
          }
        });
        
        // Gerekirse bu verileri state'te saklayabilirsiniz
        // localStorage yerine bu verileri state'te saklayın
        
        console.log('Filament tipleri güncellendi:', {
          types: uniqueTypes
        });
      } catch (error) {
        console.error('Filament verilerini işlerken hata:', error);
      }
    }
  }, [filamentsList]);

  // Arama fonksiyonu
  const filteredFilaments = filamentsList.filter((filament) => {
    try {
      const searchLower = searchTerm.toLowerCase();
      const typeMatch = typeFilter === '' || filament.type === typeFilter;
      
      return (
        ((filament.code && filament.code.toLowerCase().includes(searchLower)) ||
        (filament.name && filament.name.toLowerCase().includes(searchLower)) ||
        (filament.brand && filament.brand.toLowerCase().includes(searchLower)) ||
        (filament.color && filament.color.toLowerCase().includes(searchLower))) &&
        typeMatch
      );
    } catch (error) {
      console.error('Filament filtreleme hatası:', error, filament);
      return false;
    }
  });

  // Tüm filament tiplerini oluştur
  const types = Array.from(new Set(filamentsList.map(filament => filament.type)));
  
  // Yeni filament eklemek için modalı aç
  const handleAddFilament = () => {
    setSelectedFilament(null);
    setIsModalOpen(true);
  };

  // Filament düzenlemek için modalı aç
  const handleEditFilament = (filament: FilamentData) => {
    setSelectedFilament(filament);
    setIsModalOpen(true);
  };

  // Modal kaydetme işlemi
  const handleSaveFilament = async (filamentData: FilamentData) => {
    try {
      if (selectedFilament) {
        // Güncelleme
        const response = await fetch('/api/filaments', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedFilament.id,
            ...filamentData
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        const updatedFilament = await response.json();
        
        // State'i güncelle
        setFilamentsList(prevList => 
          prevList.map(item => 
            item.id === selectedFilament.id ? updatedFilament : item
          )
        );
      } else {
        // Yeni ekleme
        const response = await fetch('/api/filaments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filamentData),
        });
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        const newFilament = await response.json();
        
        // State'i güncelle
        setFilamentsList(prevList => [...prevList, newFilament]);
      }
    } catch (error) {
      console.error('Filament kaydedilirken hata:', error);
      alert('Filament kaydedilirken bir hata oluştu!');
      return;
    }
    
    setIsModalOpen(false);
  };

  // Filament silme işlemi
  const handleDeleteFilament = async (filamentId: string) => {
    const confirmDelete = window.confirm('Bu filamenti silmek istediğinize emin misiniz?');
    if (confirmDelete) {
      try {
        // API'den sil
        const response = await fetch(`/api/filaments?id=${filamentId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        // State'i güncelle
        setFilamentsList(prevList => prevList.filter(item => item.id !== filamentId));
        
        console.log('Filament silindi');
      } catch (error) {
        console.error('Filament silinirken hata:', error);
        alert('Filament silinirken bir hata oluştu!');
      }
    }
  };

  // Stok ekleme modalını aç
  const handleAddStock = (filament: FilamentData) => {
    setSelectedFilamentForStock(filament);
    setIsStockModalOpen(true);
  };

  // Stok ekleme işlemi
  const handleSaveStock = async (stockData: StockAddData) => {
    try {
      const response = await fetch('/api/filaments/add-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      });
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // State'i güncelle
      setFilamentsList(prevList => 
        prevList.map(item => 
          item.id === stockData.filamentId ? result.filament : item
        )
      );
      
      // Modal'ı kapat
      setIsStockModalOpen(false);
      setSelectedFilamentForStock(null);
      
      alert(`✅ ${result.message}`);
    } catch (error) {
      console.error('Stok eklenirken hata:', error);
      alert('Stok eklenirken bir hata oluştu!');
    }
  };

  // Kalan ağırlık yüzdesini hesapla
  const calculateRemainingPercentage = (filament: FilamentData) => {
    return (filament.remainingWeight / filament.totalWeight) * 100;
  };
  
  // Kritik stok durumunu kontrol et
  const isStockCritical = (filament: FilamentData) => {
    return filament.remainingWeight <= filament.criticalStock;
  };
  
  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Filament Yönetimi</h1>
          <button 
            onClick={handleAddFilament}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon /> Yeni Filament
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
          <div className="search-container flex-grow">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Filament ara..."
              className="w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="sm:w-auto"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tüm Türler</option>
            {types.map((type, index) => (
              <option key={index} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        {isLoading ? (
          <div className="py-10 text-center">
            <div className="spinner mb-4"></div>
            <p>Filament verileri yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-danger">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              Yeniden Dene
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filament</th>
                  <th>Marka</th>
                  <th>Tür / Renk</th>
                  <th>Konum</th>
                  <th>Kalan Miktar</th>
                  <th>Adet</th>
                  <th>Son Kullanım</th>
                  <th>Satın Alım Fiyatı</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredFilaments.length > 0 ? (
                  filteredFilaments.map((filament) => (
                    <tr key={filament.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full" style={{ backgroundColor: filament.color.toLowerCase() }}>
                          </div>
                          <div>
                            <div className="font-medium">{filament.code}</div>
                            <div className="text-sm text-muted-foreground">{filament.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>{filament.brand}</td>
                      <td>
                        <div>{filament.type}</div>
                        <div className="text-sm text-muted-foreground">{filament.color}</div>
                      </td>
                      <td>{filament.location}</td>
                      <td>
                        <div className="w-full">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">
                              {filament.remainingWeight}g / {filament.totalWeight}g
                            </span>
                            <span className="text-sm">
                              {Math.round(calculateRemainingPercentage(filament))}%
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-bar-value" 
                              style={{ 
                                width: `${calculateRemainingPercentage(filament)}%`,
                                backgroundColor: 
                                  isStockCritical(filament) ? 'var(--danger)' :
                                  calculateRemainingPercentage(filament) > 70 ? 'var(--success)' :
                                  calculateRemainingPercentage(filament) > 30 ? 'var(--warning)' :
                                  'var(--danger)'
                              }}
                            ></div>
                          </div>
                          {isStockCritical(filament) && (
                            <div className="text-xs text-danger mt-1">Kritik seviye!</div>
                          )}
                        </div>
                      </td>
                      <td>
                        {filament.quantity} adet
                      </td>
                      <td>
                        {new Date().toLocaleDateString('tr-TR')}
                      </td>
                      <td>
                        {filament.pricePerGram}₺
                      </td>
                      <td>
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => handleAddStock(filament)}
                            className="action-btn action-btn-success"
                            title="Stok Ekle"
                          >
                            ➕
                          </button>
                          <button 
                            onClick={() => handleEditFilament(filament)}
                            className="action-btn action-btn-edit"
                            title="Düzenle"
                          >
                            <EditIcon />
                          </button>
                          <button 
                            onClick={() => handleDeleteFilament(filament.id || '')}
                            className="action-btn action-btn-delete"
                            title="Sil"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Filament bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filament Ekle/Düzenle Modalı */}
      <FilamentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFilament}
        filament={selectedFilament}
      />

      {/* Stok Ekleme Modalı */}
      <StockAddModal 
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSave={handleSaveStock}
        filament={selectedFilamentForStock}
      />
    </Layout>
  );
} 