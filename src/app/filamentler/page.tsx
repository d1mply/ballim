'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import FilamentModal, { FilamentData } from '../../components/FilamentModal';
import StockAddModal, { StockAddData } from '../../components/StockAddModal';



// Toptancı fiyat aralığı tipi
interface PriceRange {
  id: number;
  minGram: number;
  maxGram: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  
  // Toptancı fiyat aralıkları state'leri
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [showPriceRanges, setShowPriceRanges] = useState(false);
  const [priceRangeForm, setPriceRangeForm] = useState({
    minGram: '',
    maxGram: '',
    price: ''
  });
  const [editingPriceRange, setEditingPriceRange] = useState<PriceRange | null>(null);
  
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

  // Toptancı fiyat aralıklarını yükle
  const fetchPriceRanges = async () => {
    try {
      const response = await fetch('/api/wholesale-price-ranges');
      if (response.ok) {
        const data = await response.json();
        setPriceRanges(data);
      }
    } catch (error) {
      console.error('Fiyat aralıkları yüklenirken hata:', error);
    }
  };

  // Fiyat aralıkları gösterildiğinde veri yükle
  useEffect(() => {
    if (showPriceRanges) {
      fetchPriceRanges();
    }
  }, [showPriceRanges]);
  
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

  // Fiyat aralığı form fonksiyonları
  const handlePriceRangeFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPriceRangeForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriceRangeSave = async () => {
    const { minGram, maxGram, price } = priceRangeForm;
    
    if (!minGram || !maxGram || !price) {
      alert('Tüm alanları doldurun');
      return;
    }

    const minGramNum = parseFloat(minGram);
    const maxGramNum = parseFloat(maxGram);
    const priceNum = parseFloat(price);

    if (minGramNum >= maxGramNum) {
      alert('Min gram, max gramdan küçük olmalı');
      return;
    }

    try {
      const method = editingPriceRange ? 'PUT' : 'POST';
      const body = editingPriceRange 
        ? { id: editingPriceRange.id, minGram: minGramNum, maxGram: maxGramNum, price: priceNum }
        : { minGram: minGramNum, maxGram: maxGramNum, price: priceNum };

      const response = await fetch('/api/wholesale-price-ranges', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await fetchPriceRanges();
        setPriceRangeForm({ minGram: '', maxGram: '', price: '' });
        setEditingPriceRange(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Fiyat aralığı kaydetme hatası:', error);
      alert('Bir hata oluştu');
    }
  };

  const handlePriceRangeEdit = (priceRange: PriceRange) => {
    setEditingPriceRange(priceRange);
    setPriceRangeForm({
      minGram: priceRange.minGram.toString(),
      maxGram: priceRange.maxGram.toString(),
      price: priceRange.price.toString()
    });
  };

  const handlePriceRangeDelete = async (id: number) => {
    if (!confirm('Bu fiyat aralığını silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/wholesale-price-ranges?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchPriceRanges();
      } else {
        const error = await response.json();
        alert(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Fiyat aralığı silme hatası:', error);
      alert('Bir hata oluştu');
    }
  };

  const resetPriceRangeForm = () => {
    setPriceRangeForm({ minGram: '', maxGram: '', price: '' });
    setEditingPriceRange(null);
  };

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
  
  // Ağırlık formatı (>= 1000g için hem g hem kg göster)
  const formatWeight = (grams: number) => {
    const roundedG = Math.round(grams || 0);
    if (roundedG >= 1000) {
      const kg = roundedG / 1000;
      const kgStr = (Math.trunc(kg * 1000) / 1000).toFixed(3).replace(/\.0+$/, '').replace(/\.$/, '');
      return `${roundedG}g (${kgStr}kg)`;
    }
    return `${roundedG}g`;
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
            <Icons.PlusIcon /> Yeni Filament
          </button>
        </div>

        {/* Toptancı Fiyat Aralıkları Bölümü */}
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
              {/* Fiyat Aralığı Ekleme Formu */}
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

              {/* Fiyat Aralıkları Tablosu */}
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
        
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
          <div className="search-container flex-grow">
            <Icons.SearchIcon className="search-icon" />
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
                              {formatWeight(filament.remainingWeight)} / {formatWeight(filament.totalWeight)}
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
                                backgroundColor: isStockCritical(filament) ? 'var(--danger)' : 'var(--success)'
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
                            <Icons.EditIcon />
                          </button>
                          <button 
                            onClick={() => handleDeleteFilament(filament.id || '')}
                            className="action-btn action-btn-delete"
                            title="Sil"
                          >
                            <Icons.TrashIcon />
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