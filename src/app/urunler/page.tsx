'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import ProductModal, { ProductData } from '../../components/ProductModal';
import Papa from 'papaparse';
import { useToast } from '../../contexts/ToastContext';

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
  const [packagesList, setPackagesList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showPackages, setShowPackages] = useState(true); // Paketleri göster/gizle

  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paket oluşturma modal state'leri
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState(0);
  const [packageDescription, setPackageDescription] = useState('');
  const [packageItems, setPackageItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [isPackageSubmitting, setIsPackageSubmitting] = useState(false);

  // Import/Export state'leri
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast hook
  const toast = useToast();

  
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

  // Paketleri yükle
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch('/api/packages?includeItems=true');
        if (!response.ok) {
          throw new Error('Paketler yüklenemedi');
        }
        const data = await response.json();
        setPackagesList(data);
      } catch (error) {
        console.error('Paketleri yükleme hatası:', error);
        setPackagesList([]);
      }
    };
    
    fetchPackages();
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

  // Paketleri filtrele
  const filteredPackages = packagesList.filter((pkg) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (pkg.name && pkg.name.toLowerCase().includes(searchLower)) ||
      (pkg.package_code && pkg.package_code.toLowerCase().includes(searchLower)) ||
      (pkg.description && pkg.description.toLowerCase().includes(searchLower))
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

  // Ürün kopyala
  const handleDuplicateProduct = async (product: ProductData) => {
    try {
      const response = await fetch('/api/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: product.id })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Kopyalama başarısız');
      }

      const duplicated = await response.json();
      // Listeye ekle
      setProductsList(prev => [...prev, duplicated]);
      // İstersen detay açmadan düzenlemeye al
      setSelectedProduct(duplicated);
      setIsModalOpen(true);
    } catch (e) {
      console.error('Kopyalama hatası:', e);
      toast.error(`Ürün kopyalanamadı: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Modal kaydetme işlemi
  const handleSaveProduct = async (productData: ProductData) => {
    console.log("Frontend - Kaydetme işlemi başlıyor");
    console.log("Selected Product:", selectedProduct);
    console.log("Product Data:", JSON.stringify(productData, null, 2));
    
    try {
      if (selectedProduct) {
        // Güncelleme - PUT isteği
        // Frontend'den API'ye veri mapping'i
        const updatePayload = {
          id: selectedProduct.id,
          productCode: productData.code,
          productType: productData.productType,
          imagePath: productData.image,
          barcode: productData.barcode,
          capacity: productData.capacity,
          dimensionX: productData.dimensionX,
          dimensionY: productData.dimensionY,
          dimensionZ: productData.dimensionZ,
          printTime: productData.printTime,
          totalGram: productData.totalGram,
          pieceGram: productData.pieceGram,
          filePath: productData.filePath,
          notes: productData.notes,
          filaments: productData.filaments
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
        
        // Frontend'den API'ye veri mapping'i
        const apiData = {
          productCode: productData.code,
          productType: productData.productType,
          imagePath: productData.image,
          barcode: productData.barcode,
          capacity: productData.capacity,
          dimensionX: productData.dimensionX,
          dimensionY: productData.dimensionY,
          dimensionZ: productData.dimensionZ,
          printTime: productData.printTime,
          totalGram: productData.totalGram,
          pieceGram: productData.pieceGram,
          filePath: productData.filePath,
          notes: productData.notes,
          filaments: productData.filaments
        };

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
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
      toast.success(selectedProduct ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!');
      console.log("Kaydetme işlemi başarıyla tamamlandı");
    } catch (error) {
      console.error('Frontend - Ürün kaydedilirken hata:', error);
      toast.error(`Ürün kaydedilirken bir hata oluştu: ${error instanceof Error ? error.message : String(error)}`);
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
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `API hatası: ${response.status} ${response.statusText}`);
        }
        
        // State'i güncelle
        setProductsList(prevList => prevList.filter(item => item.id !== productId));
        
        console.log('Ürün silindi:', data.message);
        toast.success('Ürün başarıyla silindi!');
      } catch (error) {
        console.error('Ürün silinirken hata:', error);
        toast.error(`Ürün silinirken bir hata oluştu: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  // Boyutları formatla
  const formatDimensions = (product: ProductData) => {
    return `${product.dimensionX}x${product.dimensionY}x${product.dimensionZ} mm`;
  };

  // Ürünleri CSV olarak dışarı aktar
  const handleExportProducts = () => {
    try {
      // CSV başlıkları
      const headers = [
        'code',
        'productType',
        'image',
        'barcode',
        'capacity',
        'dimensionX',
        'dimensionY',
        'dimensionZ',
        'printTime',
        'totalGram',
        'pieceGram',
        'filePath',
        'notes',
        'filaments'
      ];

      // Ürünleri CSV formatına dönüştür
      const csvData = filteredProducts.map(product => ({
        code: product.code || '',
        productType: product.productType || '',
        image: product.image || '',
        barcode: product.barcode || '',
        capacity: product.capacity || 0,
        dimensionX: product.dimensionX || 0,
        dimensionY: product.dimensionY || 0,
        dimensionZ: product.dimensionZ || 0,
        printTime: product.printTime || 0,
        totalGram: product.totalGram || 0,
        pieceGram: product.pieceGram || 0,
        filePath: product.filePath || '',
        notes: product.notes || '',
        filaments: product.filaments ? JSON.stringify(product.filaments) : ''
      }));

      // CSV oluştur
      const csv = Papa.unparse(csvData, {
        header: true,
        delimiter: ','
      });

      // Blob oluştur ve indir
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `urunler_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${filteredProducts.length} ürün başarıyla dışarı aktarıldı!`);
    } catch (error) {
      console.error('Export hatası:', error);
      toast.error(`Dışarı aktarma sırasında bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  };

  // CSV dosyasını içeri aktar
  const handleImportProducts = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      
      // CSV'yi parse et
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const importedProducts = results.data as any[];
            let successCount = 0;
            let errorCount = 0;
            const errors: string[] = [];

            for (const row of importedProducts) {
              try {
                // Filamentleri parse et
                let filaments: any[] = [];
                if (row.filaments) {
                  try {
                    filaments = JSON.parse(row.filaments);
                  } catch {
                    // JSON parse edilemezse boş bırak
                  }
                }

                // API formatına dönüştür
                const apiData = {
                  productCode: row.code || row.productCode || '',
                  productType: row.productType || row.product_type || '',
                  imagePath: row.image || row.imagePath || null,
                  barcode: row.barcode || null,
                  capacity: parseInt(row.capacity) || 0,
                  dimensionX: parseFloat(row.dimensionX || row.dimension_x) || 0,
                  dimensionY: parseFloat(row.dimensionY || row.dimension_y) || 0,
                  dimensionZ: parseFloat(row.dimensionZ || row.dimension_z) || 0,
                  printTime: parseFloat(row.printTime || row.print_time) || 0,
                  totalGram: parseFloat(row.totalGram || row.total_gram) || 0,
                  pieceGram: parseFloat(row.pieceGram || row.piece_gram) || 0,
                  filePath: row.filePath || row.file_path || null,
                  notes: row.notes || null,
                  filaments: filaments
                };

                // Gerekli alanları kontrol et
                if (!apiData.productCode || !apiData.productType) {
                  errors.push(`${row.code || 'Bilinmeyen'}: Ürün kodu ve tipi gerekli`);
                  errorCount++;
                  continue;
                }

                // Ürünü ekle veya güncelle
                const response = await fetch('/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(apiData)
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  errors.push(`${apiData.productCode}: ${errorData.error || 'Hata oluştu'}`);
                  errorCount++;
                } else {
                  successCount++;
                }
              } catch (error) {
                errors.push(`${row.code || 'Bilinmeyen'}: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
                errorCount++;
              }
            }

            // Sonuçları göster
            if (errorCount > 0) {
              toast.warning(`${successCount} ürün eklendi, ${errorCount} hata oluştu. Detaylar için konsolu kontrol edin.`);
              console.error('Import hataları:', errors);
            } else {
              toast.success(`${successCount} ürün başarıyla içeri aktarıldı!`);
            }

            // Ürünleri yeniden yükle
            const response = await fetch('/api/products');
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                setProductsList(data);
              }
            }

            setIsImportModalOpen(false);
          } catch (error) {
            console.error('Import işleme hatası:', error);
            toast.error(`İçeri aktarma sırasında bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
          } finally {
            setIsImporting(false);
          }
        },
        error: (error) => {
          console.error('CSV parse hatası:', error);
          toast.error(`CSV dosyası okunamadı: ${error.message}`);
          setIsImporting(false);
        }
      });
    } catch (error) {
      console.error('Import hatası:', error);
      toast.error(`Dosya okuma hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      setIsImporting(false);
    }
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
              <div className="flex gap-2">
                <button 
                  onClick={handleExportProducts}
                  className="btn-secondary flex items-center gap-2"
                  title="Ürünleri CSV olarak dışarı aktar"
                >
                  <Icons.DownloadIcon /> Dışarı Aktar
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="btn-secondary flex items-center gap-2"
                  title="CSV dosyasından ürünleri içeri aktar"
                >
                  <Icons.UploadIcon /> İçeri Aktar
                </button>
                <button 
                  onClick={handleAddProduct}
                  className="btn-primary flex items-center gap-2"
                >
                  <Icons.PlusIcon /> Yeni Ürün
                </button>
                <button
                  onClick={() => setIsPackageModalOpen(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Icons.Plus /> Paket Oluştur
                </button>
              </div>
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
          <div className="flex items-center gap-4">
            <span>{filteredProducts.length} ürün{showPackages ? `, ${filteredPackages.length} paket` : ''} bulundu</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPackages}
                onChange={(e) => setShowPackages(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Paketleri göster</span>
            </label>
          </div>
          {searchTerm && <span>Arama: &quot;{searchTerm}&quot;</span>}
          {categoryFilter && <span>Kategori: {categoryFilter}</span>}
        </div>
        
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3">
            {/* Ürünler */}
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-card rounded-lg shadow-sm border border-border p-2 md:p-3">
                <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-secondary rounded-md overflow-hidden">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.productType}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      Görsel Yok
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs md:text-sm truncate">{product.code}</h3>
                      <p className="text-xs text-muted-foreground truncate">{product.productType}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleShowDetails(product)}
                        className="p-0.5 md:p-1 hover:text-primary"
                        title="Detayları Göster"
                      >
                        <Icons.EyeIcon className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                      {user?.type === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-0.5 md:p-1 hover:text-primary"
                            title="Düzenle"
                          >
                            <Icons.EditIcon className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(product)}
                            className="p-0.5 md:p-1 hover:text-primary"
                            title="Kopyala"
                          >
                            <Icons.ClipboardIcon className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-0.5 md:p-1 hover:text-destructive"
                            title="Sil"
                          >
                            <Icons.TrashIcon className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs space-y-0.5">
                    <p className="truncate">Boyut: {formatDimensions(product)}</p>
                    <p className="truncate">Kap: {product.capacity}/tabla</p>
                    <p className="truncate">Süre: {product.printTime}s</p>
                  </div>
                </div>
              </div>
            ))}
            {/* Paketler */}
            {showPackages && filteredPackages.map((pkg) => (
              <div key={`package-${pkg.id}`} className="bg-card rounded-lg shadow-sm border-2 border-blue-300 border-dashed p-2 md:p-3">
                <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-blue-50 rounded-md overflow-hidden flex items-center justify-center">
                  <div className="text-center text-blue-600">
                    <Icons.PackageIcon className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1" />
                    <span className="text-xs font-semibold">PAKET</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs md:text-sm truncate">{pkg.package_code}</h3>
                      <p className="text-xs text-muted-foreground truncate">{pkg.name}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => setSelectedPackage(pkg)}
                        className="p-0.5 md:p-1 hover:text-primary"
                        title="Detayları Göster"
                      >
                        <Icons.EyeIcon className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-primary truncate">Fiyat: {pkg.price}₺</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {pkg.items?.length || 0} ürün
                    </p>
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
                {/* Ürünler */}
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
                              onClick={() => handleDuplicateProduct(product)}
                              className="p-1 hover:text-primary"
                              title="Kopyala"
                            >
                              <Icons.ClipboardIcon />
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
                {/* Paketler */}
                {showPackages && filteredPackages.map((pkg) => (
                  <tr key={`package-${pkg.id}`} className="border-b border-border bg-blue-50/30">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{pkg.package_code}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">PAKET</span>
                      </div>
                    </td>
                    <td className="p-2">{pkg.name}</td>
                    <td className="p-2">-</td>
                    <td className="p-2">{pkg.items?.length || 0} ürün</td>
                    <td className="p-2">-</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPackage(pkg)}
                          className="p-1 hover:text-primary"
                          title="Detayları Göster"
                        >
                          <Icons.EyeIcon />
                        </button>
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
      
      {/* Paket Detay Modalı */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Paket Detayları</h2>
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icons.XIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedPackage.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedPackage.package_code}</p>
                </div>

                {selectedPackage.description && (
                  <div>
                    <p className="text-sm text-gray-700">{selectedPackage.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-xl font-bold text-primary">Fiyat: {selectedPackage.price}₺</p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold mb-3">Paket İçeriği:</h4>
                  <div className="space-y-2">
                    {selectedPackage.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{item.productCode}</span>
                          <span className="text-sm text-muted-foreground ml-2">{item.productType}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">{item.quantity} adet</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            item.availableStock >= item.quantity 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            Stok: {item.availableStock}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paket Oluştur Modalı */}
      {isPackageModalOpen && user?.type === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Yeni Paket Oluştur</h2>
                <button
                  onClick={() => {
                    setIsPackageModalOpen(false);
                    setPackageName('');
                    setPackagePrice(0);
                    setPackageDescription('');
                    setPackageItems([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isPackageSubmitting}
                >
                  <Icons.XIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!packageName || packagePrice <= 0 || packageItems.length === 0) {
                  toast.warning('Lütfen paket adı, fiyat ve en az bir ürün ekleyin.');
                  return;
                }

                setIsPackageSubmitting(true);
                try {
                  const response = await fetch('/api/packages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: packageName,
                      description: packageDescription,
                      price: packagePrice,
                      items: packageItems.map(item => ({
                        productId: parseInt(item.productId, 10),
                        quantity: item.quantity
                      }))
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Paket oluşturulamadı');
                  }

                  const result = await response.json();
                  toast.success(`Paket başarıyla oluşturuldu! (${result.package?.package_code || 'PAK-XXX'})`);
                  
                  // Paketleri yeniden yükle
                  const packagesResponse = await fetch('/api/packages?includeItems=true');
                  if (packagesResponse.ok) {
                    const packagesData = await packagesResponse.json();
                    setPackagesList(packagesData);
                  }
                  
                  setIsPackageModalOpen(false);
                  setPackageName('');
                  setPackagePrice(0);
                  setPackageDescription('');
                  setPackageItems([]);
                } catch (error) {
                  console.error('Paket oluşturma hatası:', error);
                  toast.error(`Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
                } finally {
                  setIsPackageSubmitting(false);
                }
              }}>
                <div className="space-y-4">
                  {/* Paket Adı */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Paket Adı *</label>
                    <input
                      type="text"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Örn: Anahtarlık Standı Seti"
                      required
                      disabled={isPackageSubmitting}
                    />
                  </div>

                  {/* Paket Fiyatı */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Paket Fiyatı (₺) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={packagePrice || ''}
                      onChange={(e) => setPackagePrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="750"
                      required
                      disabled={isPackageSubmitting}
                    />
                  </div>

                  {/* Paket Açıklaması */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Açıklama (Opsiyonel)</label>
                    <textarea
                      value={packageDescription}
                      onChange={(e) => setPackageDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Paket hakkında açıklama..."
                      disabled={isPackageSubmitting}
                    />
                  </div>

                  {/* Ürün Ekleme */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Paket İçindeki Ürünler *</label>
                    <div className="space-y-3">
                      {packageItems.map((item, index) => {
                        const product = productsList.find(p => p.id === item.productId);
                        return (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                const newItems = [...packageItems];
                                newItems[index].productId = e.target.value;
                                setPackageItems(newItems);
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              disabled={isPackageSubmitting}
                              required
                            >
                              <option value="">Ürün seçin...</option>
                              {productsList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.productType}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...packageItems];
                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                setPackageItems(newItems);
                              }}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Adet"
                              disabled={isPackageSubmitting}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPackageItems(packageItems.filter((_, i) => i !== index));
                              }}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              disabled={isPackageSubmitting}
                            >
                              <Icons.TrashIcon className="w-5 h-5" />
                            </button>
                            {product && (
                              <span className="text-sm text-gray-600">
                                Stok: {product.availableStock || 0}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setPackageItems([...packageItems, { productId: '', quantity: 1 }])}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-gray-600 hover:text-primary"
                        disabled={isPackageSubmitting}
                      >
                        <Icons.Plus className="w-5 h-5 inline mr-2" />
                        Ürün Ekle
                      </button>
                    </div>
                  </div>
                </div>

                {/* Butonlar */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPackageModalOpen(false);
                      setPackageName('');
                      setPackagePrice(0);
                      setPackageDescription('');
                      setPackageItems([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isPackageSubmitting}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isPackageSubmitting || !packageName || packagePrice <= 0 || packageItems.length === 0}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPackageSubmitting ? 'Oluşturuluyor...' : 'Paket Oluştur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Modalı */}
      {isImportModalOpen && user?.type === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Ürünleri İçeri Aktar</h2>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isImporting}
                >
                  <Icons.XIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">CSV Formatı</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    CSV dosyanız şu sütunları içermelidir:
                  </p>
                  <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                    <li><strong>code</strong> - Ürün kodu (zorunlu)</li>
                    <li><strong>productType</strong> - Ürün tipi (zorunlu)</li>
                    <li><strong>image</strong> - Görsel URL (opsiyonel)</li>
                    <li><strong>barcode</strong> - Barkod (opsiyonel)</li>
                    <li><strong>capacity</strong> - Kapasite (opsiyonel)</li>
                    <li><strong>dimensionX, dimensionY, dimensionZ</strong> - Boyutlar (opsiyonel)</li>
                    <li><strong>printTime</strong> - Baskı süresi (opsiyonel)</li>
                    <li><strong>totalGram, pieceGram</strong> - Ağırlıklar (opsiyonel)</li>
                    <li><strong>filePath</strong> - Dosya yolu (opsiyonel)</li>
                    <li><strong>notes</strong> - Notlar (opsiyonel)</li>
                    <li><strong>filaments</strong> - JSON formatında filamentler (opsiyonel)</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    CSV Dosyası Seç
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportProducts(file);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isImporting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sadece CSV dosyaları kabul edilir. Excel dosyalarını CSV olarak kaydedin.
                  </p>
                </div>

                {isImporting && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <Icons.RefreshIcon className="w-4 h-4 animate-spin" />
                      Ürünler içeri aktarılıyor... Lütfen bekleyin.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isImporting}
                >
                  {isImporting ? 'İşlem Devam Ediyor...' : 'Kapat'}
                </button>
              </div>
            </div>
          </div>
        </div>
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