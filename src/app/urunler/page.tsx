'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import ProductModal, { ProductData } from '../../components/ProductModal';

// LoggedInUser arayüzü
interface LoggedInUser {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

// Örnek veri (şimdilik API'den yükleniyor)

export default function UrunlerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [productsList, setProductsList] = useState<ProductData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const [user, setUser] = useState<LoggedInUser | null>(null);
  

  
  // Kullanıcı bilgisini yükle
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as LoggedInUser;
        setUser(userData);
      } catch (error) {
        console.error('Kullanıcı bilgisi yüklenirken hata:', error);
      }
    }
  }, []);

  // API'den verileri yükle
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/products');
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Veri varsa göster, yoksa boş liste göster
        if (Array.isArray(data)) {
          setProductsList(data);
        } else {
          console.log('Ürün verisi bulunamadı, boş liste gösteriliyor');
          setProductsList([]);
        }
      } catch (error) {
        console.error('Ürünleri getirme hatası:', error);
        setError('Ürünler yüklenirken bir hata oluştu');
        setProductsList([]); // Hata durumunda boş liste göster
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, []);


  
  // Arama fonksiyonu
  const filteredProducts = productsList.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    const categoryMatch = categoryFilter === '' || product.productType.toLowerCase().includes(categoryFilter.toLowerCase());
    
    return (
      ((product.code && product.code.toLowerCase().includes(searchLower)) ||
      (product.productType && product.productType.toLowerCase().includes(searchLower))) &&
      categoryMatch
    );
  });

  // Kategorileri oluştur
  const categories = Array.from(new Set(productsList.map(product => product.productType)));
  
  // Yeni ürün eklemek için modalı aç
  const handleAddProduct = () => {
    // Önce seçili ürünü sıfırla
    setSelectedProduct(null);
    // Modalı aç
    setIsModalOpen(true);
  };

  // Ürün düzenlemek için modalı aç
  const handleEditProduct = (product: ProductData) => {
    // Ürünü seç ve modalı aç
    setSelectedProduct({...product});
    setIsModalOpen(true);
  };
  
  // Ürün detaylarını göster
  const handleShowDetails = (product: ProductData) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  // Modal kaydetme işlemi
  const handleSaveProduct = async (productData: ProductData) => {
    console.log("Frontend - Kaydetme işlemi başlıyor");
    console.log("Selected Product:", selectedProduct);
    console.log("Product Data:", JSON.stringify(productData, null, 2));
    
    try {
      if (selectedProduct) {
        // Güncelleme - PUT isteği
        const updatePayload = {
          id: selectedProduct.id,
          ...productData
        };
        
        console.log("PUT isteği gönderiliyor:", JSON.stringify(updatePayload, null, 2));
        
        const response = await fetch('/api/products', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });
        
        console.log("PUT isteği cevabı:", response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Cevap parse edilemedi' }));
          console.error("PUT isteği hata detayları:", errorData);
          throw new Error(`API hatası: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
        
        const updatedProduct = await response.json();
        console.log("Güncellenen ürün:", updatedProduct);
        
        // State'i güncelle
        setProductsList(prevList => 
          prevList.map(item => 
            item.id === selectedProduct.id ? updatedProduct : item
          )
        );
      } else {
        // Yeni ekleme - POST isteği
        console.log("POST isteği gönderiliyor:", JSON.stringify(productData, null, 2));
        
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productData),
        });
        
        console.log("POST isteği cevabı:", response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Cevap parse edilemedi' }));
          console.error("POST isteği hata detayları:", errorData);
          throw new Error(`API hatası: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
        
        const newProduct = await response.json();
        console.log("Yeni eklenen ürün:", newProduct);
        
        // State'i güncelle
        setProductsList(prevList => [...prevList, newProduct]);
      }
      
      // Modal'ı kapat ve seçili ürünü temizle
      setIsModalOpen(false);
      setSelectedProduct(null);
      console.log("Kaydetme işlemi başarıyla tamamlandı");
    } catch (error) {
      console.error('Frontend - Ürün kaydedilirken hata:', error);
      alert(`Ürün kaydedilirken bir hata oluştu: ${error instanceof Error ? error.message : String(error)}`);
      // Hata durumunda bile modal'ı kapat
      setIsModalOpen(false);
      setSelectedProduct(null);
    }
  };

  // Ürün silme işlemi
  const handleDeleteProduct = async (productId: string) => {
    const confirmDelete = window.confirm('Bu ürünü silmek istediğinize emin misiniz?');
    if (confirmDelete) {
      try {
        // API'den sil - DELETE isteği
        const response = await fetch(`/api/products?id=${productId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        // State'i güncelle
        setProductsList(prevList => prevList.filter(item => item.id !== productId));
        
        console.log('Ürün silindi');
      } catch (error) {
        console.error('Ürün silinirken hata:', error);
        alert('Ürün silinirken bir hata oluştu!');
      }
    }
  };

  // Boyutları formatla
  const formatDimensions = (product: ProductData) => {
    return `${product.dimensionX}x${product.dimensionY}x${product.dimensionZ} mm`;
  };
  
  return (
    <Layout>
      <div className="space-y-5 w-full">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Ürünler</h1>
          <div className="flex gap-3 items-center">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-secondary'}`}
                title="Kart Görünümü"
              >
                <Icons.GridIcon />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-secondary'}`}
                title="Tablo Görünümü"
              >
                <Icons.ListIcon />
              </button>
            </div>
            
            {user?.type === 'admin' && (
              <button 
                onClick={handleAddProduct}
                className="btn-primary flex items-center gap-2"
              >
                <Icons.PlusIcon /> Yeni Ürün
              </button>
            )}
          </div>
        </div>


        
        <div className="bg-card border border-border p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="search-container flex-grow">
              <Icons.SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Ürün ara..."
                className="w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  showFilters 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-card hover:bg-secondary border-border'
                }`}
                title="Filtreleri Göster/Gizle"
              >
                <Icons.FilterIcon /> Filtreler
              </button>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Kategori:</label>
                <select 
                  className="min-w-[140px] px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Gelişmiş Filtreler</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Baskı Süresi</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">Tümü</option>
                    <option value="0-12">0-12 saat</option>
                    <option value="12-24">12-24 saat</option>
                    <option value="24+">24+ saat</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Filament Tipi</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">Tümü</option>
                    <option value="PLA">PLA</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Stok Durumu</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">Tümü</option>
                    <option value="stokta-var">Stokta Var</option>
                    <option value="stokta-yok">Stokta Yok</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 text-sm bg-card hover:bg-secondary border border-border rounded-lg transition-colors"
                >
                  Filtreleri Gizle
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mb-2 py-1 border-b border-border flex justify-between items-center text-sm">
          <span>{filteredProducts.length} ürün bulundu</span>
          {searchTerm && <span>Arama: &quot;{searchTerm}&quot;</span>}
          {categoryFilter && <span>Kategori: {categoryFilter}</span>}
        </div>
        
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-card rounded-lg shadow-sm border border-border p-4">
                <div className="relative aspect-square mb-4 bg-secondary rounded-md overflow-hidden">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.productType}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Görsel Yok
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{product.code}</h3>
                      <p className="text-sm text-muted-foreground">{product.productType}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShowDetails(product)}
                        className="p-1 hover:text-primary"
                        title="Detayları Göster"
                      >
                        <Icons.EyeIcon />
                      </button>
                      {user?.type === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-1 hover:text-primary"
                            title="Düzenle"
                          >
                            <Icons.EditIcon />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1 hover:text-destructive"
                            title="Sil"
                          >
                            <Icons.TrashIcon />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <p>Boyutlar: {formatDimensions(product)}</p>
                    <p>Kapasite: {product.capacity} adet/tabla</p>
                    <p>Baskı Süresi: {product.printTime} saat</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="p-2 text-left">Kod</th>
                  <th className="p-2 text-left">Tür</th>
                  <th className="p-2 text-left">Boyutlar</th>
                  <th className="p-2 text-left">Kapasite</th>
                  <th className="p-2 text-left">Baskı Süresi</th>
                  <th className="p-2 text-left">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="p-2">{product.code}</td>
                    <td className="p-2">{product.productType}</td>
                    <td className="p-2">{formatDimensions(product)}</td>
                    <td className="p-2">{product.capacity} adet/tabla</td>
                    <td className="p-2">{product.printTime} saat</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleShowDetails(product)}
                          className="p-1 hover:text-primary"
                          title="Detayları Göster"
                        >
                          <Icons.EyeIcon />
                        </button>
                        {user?.type === 'admin' && (
                          <>
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-1 hover:text-primary"
                              title="Düzenle"
                            >
                              <Icons.EditIcon />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1 hover:text-destructive"
                              title="Sil"
                            >
                              <Icons.TrashIcon />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ürün Ekle/Düzenle Modalı */}
      {isModalOpen && user?.type === 'admin' && (
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onSave={handleSaveProduct}
          product={selectedProduct}
        />
      )}
      
      {/* Ürün Detay Modalı */}
      {selectedProduct && isDetailOpen && (
        <div className="modal">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Ürün Detayı - {selectedProduct.code}</h2>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="aspect-square bg-muted rounded-md overflow-hidden mb-4">
                    {selectedProduct.image ? (
                      <img 
                        src={selectedProduct.image} 
                        alt={selectedProduct.code} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Ürün Görseli Yok
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">{selectedProduct.productType}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Ürün Kodu: {selectedProduct.code}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Boyutlar</h4>
                      <p>{formatDimensions(selectedProduct)}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Kapasite</h4>
                      <p>{selectedProduct.capacity} adet / tabla</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Baskı Süresi</h4>
                      <p>{selectedProduct.printTime} saat</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Ağırlık</h4>
                      <p>Toplam: {selectedProduct.totalGram}g, Adet: {selectedProduct.pieceGram}g/adet</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Dosya Konumu</h4>
                      <p>{selectedProduct.filePath || 'Belirtilmemiş'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Kullanılan Filamentler</h4>
                <div className="overflow-hidden border border-border rounded-md">
                  <table className="w-full">
                    <thead className="bg-muted text-left">
                      <tr>
                        <th className="py-2 px-4 font-medium">Filament</th>
                        <th className="py-2 px-4 font-medium">Renk</th>
                        <th className="py-2 px-4 font-medium">Marka</th>
                        <th className="py-2 px-4 font-medium">Miktar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.filaments?.map((filament, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="py-2 px-4">{filament.type}</td>
                          <td className="py-2 px-4">{filament.color}</td>
                          <td className="py-2 px-4">{filament.brand}</td>
                          <td className="py-2 px-4">{filament.weight}g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {selectedProduct.notes && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2">Notlar</h4>
                  <div className="p-3 bg-muted rounded-md">
                    {selectedProduct.notes}
                  </div>
                </div>
              )}
              
              <div className="modal-footer mt-6">
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleEditProduct(selectedProduct);
                  }}
                  className="btn-secondary"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="btn-primary"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 