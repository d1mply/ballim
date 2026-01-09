'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../Layout';
import ProductModal, { ProductData } from '../ProductModal';
import { Icons } from '../../utils/Icons';
import Papa from 'papaparse';
import { useToast } from '../../contexts/ToastContext';

interface LoggedInUser {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

interface PackageItem {
  productId: string;
  quantity: number;
  productCode?: string;
  productType?: string;
  availableStock?: number;
}

interface PackageData {
  id: string;
  package_code: string;
  name: string;
  description?: string;
  price: number;
  items?: PackageItem[];
}

interface Filters {
  searchTerm: string;
  category: string;
  printTimeMin: number | '';
  printTimeMax: number | '';
  filamentType: string;
  filamentColor: string;
  stockStatus: string;
  totalGramMin: number | '';
  totalGramMax: number | '';
  stockMin: number | '';
  stockMax: number | '';
}

const GRID_PAGE_SIZE = 24;
const TABLE_PAGE_SIZE = 50;

export default function ProductsPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [productsList, setProductsList] = useState<ProductData[]>([]);
  const [packagesList, setPackagesList] = useState<PackageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showPackages, setShowPackages] = useState(true);
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState(0);
  const [packageDescription, setPackageDescription] = useState('');
  const [packageItems, setPackageItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [isPackageSubmitting, setIsPackageSubmitting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    category: '',
    printTimeMin: '',
    printTimeMax: '',
    filamentType: '',
    filamentColor: '',
    stockStatus: '',
    totalGramMin: '',
    totalGramMax: '',
    stockMin: '',
    stockMax: '',
  });

  // Kullanıcı bilgisini yükle
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as LoggedInUser;
        setUser(userData);
      } catch (err) {
        console.error('Kullanıcı bilgisi yüklenirken hata:', err);
      }
    }
  }, []);

  // Ürün ve paketleri getir
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [productsRes, packagesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/packages?includeItems=true'),
        ]);

        if (!productsRes.ok) {
          throw new Error(`Ürünler yüklenemedi: ${productsRes.statusText}`);
        }
        const productsData = await productsRes.json();
        setProductsList(Array.isArray(productsData) ? productsData : []);

        if (packagesRes.ok) {
          const packagesData = await packagesRes.json();
          setPackagesList(Array.isArray(packagesData) ? packagesData : []);
        } else {
          setPackagesList([]);
        }
      } catch (err) {
        console.error('Veri yükleme hatası:', err);
        setError('Ürünler yüklenirken bir hata oluştu');
        setProductsList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtreli ürünler
  const filteredProducts = useMemo(() => {
    const searchLower = filters.searchTerm.trim().toLowerCase();
    return productsList.filter((product) => {
      const categoryMatch =
        !filters.category ||
        product.productType?.toLowerCase().includes(filters.category.toLowerCase());

      const printTime = product.printTime || 0;
      const printTimeMatch =
        (filters.printTimeMin === '' || printTime >= filters.printTimeMin) &&
        (filters.printTimeMax === '' || printTime <= filters.printTimeMax);

      const filamentTypeMatch = !filters.filamentType
        ? true
        : product.filaments?.some(
            (f) => f.type?.toLowerCase() === filters.filamentType.toLowerCase(),
          ) ?? false;

      const filamentColorMatch = !filters.filamentColor
        ? true
        : product.filaments?.some(
            (f) => f.color?.toLowerCase().includes(filters.filamentColor.toLowerCase()),
          ) ?? false;

      const stock = product.availableStock ?? 0;
      const stockStatusMatch =
        filters.stockStatus === ''
          ? true
          : filters.stockStatus === 'stokta-var'
          ? stock > 0
          : stock === 0;

      const stockRangeMatch =
        (filters.stockMin === '' || stock >= filters.stockMin) &&
        (filters.stockMax === '' || stock <= filters.stockMax);

      const totalGram = product.totalGram ?? 0;
      const gramMatch =
        (filters.totalGramMin === '' || totalGram >= filters.totalGramMin) &&
        (filters.totalGramMax === '' || totalGram <= filters.totalGramMax);

      const textMatch =
        (!product.code && !product.productType) ||
        (product.code?.toLowerCase().includes(searchLower) ||
          product.productType?.toLowerCase().includes(searchLower));

      return (
        textMatch &&
        categoryMatch &&
        printTimeMatch &&
        filamentTypeMatch &&
        filamentColorMatch &&
        stockStatusMatch &&
        stockRangeMatch &&
        gramMatch
      );
    });
  }, [filters, productsList]);

  const filteredPackages = useMemo(() => {
    const searchLower = filters.searchTerm.trim().toLowerCase();
    return packagesList.filter((pkg) => {
      return (
        pkg.name?.toLowerCase().includes(searchLower) ||
        pkg.package_code?.toLowerCase().includes(searchLower) ||
        pkg.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [filters.searchTerm, packagesList]);

  // Sayfalama
  const pageSize = viewMode === 'grid' ? GRID_PAGE_SIZE : TABLE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Kategori listesi
  const categories = useMemo(
    () => Array.from(new Set(productsList.map((p) => p.productType).filter(Boolean))),
    [productsList],
  );

  const filamentTypes = useMemo(
    () =>
      Array.from(
        new Set(
          productsList.flatMap((p) => p.filaments?.map((f) => f.type).filter(Boolean) || []),
        ),
      ),
    [productsList],
  );

  const filamentColors = useMemo(
    () =>
      Array.from(
        new Set(
          productsList.flatMap((p) => p.filaments?.map((f) => f.color).filter(Boolean) || []),
        ),
      ),
    [productsList],
  );

  const productTypes = useMemo(
    () => Array.from(new Set(productsList.map((p) => p.productType).filter(Boolean))),
    [productsList],
  );

  // Handlers
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: ProductData) => {
    setSelectedProduct({ ...product });
    setIsModalOpen(true);
  };

  const handleShowDetails = (product: ProductData) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleDuplicateProduct = async (product: ProductData) => {
    try {
      const response = await fetch('/api/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: product.id }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Kopyalama başarısız');
      }
      const duplicated = await response.json();
      setProductsList((prev) => [...prev, duplicated]);
      setSelectedProduct(duplicated);
      setIsModalOpen(true);
    } catch (e) {
      console.error('Kopyalama hatası:', e);
      toast.error(`Ürün kopyalanamadı: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirmDelete = window.confirm('Bu ürünü silmek istediğinize emin misiniz?');
    if (!confirmDelete) return;
    try {
      const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `API hatası: ${response.status}`);
      }
      setProductsList((prev) => prev.filter((item) => item.id !== productId));
      toast.success('Ürün başarıyla silindi!');
    } catch (err) {
      console.error('Ürün silinirken hata:', err);
      toast.error(
        `Ürün silinirken bir hata oluştu: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleSaveProduct = async (productData: ProductData) => {
    try {
      if (selectedProduct) {
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
          filaments: productData.filaments,
        };

        const response = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Cevap parse edilemedi' }));
          throw new Error(
            `API hatası: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
          );
        }

        const responseData = await response.json();
        const currentProduct = productsList.find((p) => p.id === selectedProduct.id);
        const formattedProduct =
          responseData.product && responseData.product.product_code
            ? {
                id: responseData.product.id,
                code: responseData.product.product_code,
                productType: responseData.product.product_type,
                image: responseData.product.image_path,
                barcode: responseData.product.barcode || '',
                capacity: responseData.product.capacity || 0,
                dimensionX: responseData.product.dimension_x || 0,
                dimensionY: responseData.product.dimension_y || 0,
                dimensionZ: responseData.product.dimension_z || 0,
                printTime: responseData.product.print_time || 0,
                totalGram: responseData.product.total_gram || 0,
                pieceGram: responseData.product.piece_gram || 0,
                filePath: responseData.product.file_path,
                notes: responseData.product.notes || '',
                availableStock: currentProduct?.availableStock || 0,
                filaments: productData.filaments || currentProduct?.filaments || [],
              }
            : responseData;

        setProductsList((prev) =>
          prev.map((item) => (item.id === selectedProduct.id ? formattedProduct : item)),
        );
        toast.success('Ürün başarıyla güncellendi!');
      } else {
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
          filaments: productData.filaments,
        };

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Cevap parse edilemedi' }));
          throw new Error(
            `API hatası: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
          );
        }

        const responseData = await response.json();
        const formattedProduct =
          responseData.product && responseData.product.product_code
            ? {
                id: responseData.product.id,
                code: responseData.product.product_code,
                productType: responseData.product.product_type,
                image: responseData.product.image_path,
                barcode: responseData.product.barcode || '',
                capacity: responseData.product.capacity || 0,
                dimensionX: responseData.product.dimension_x || 0,
                dimensionY: responseData.product.dimension_y || 0,
                dimensionZ: responseData.product.dimension_z || 0,
                printTime: responseData.product.print_time || 0,
                totalGram: responseData.product.total_gram || 0,
                pieceGram: responseData.product.piece_gram || 0,
                filePath: responseData.product.file_path,
                notes: responseData.product.notes || '',
                availableStock: 0,
                filaments: productData.filaments || [],
              }
            : responseData;

        setProductsList((prev) => [...prev, formattedProduct]);
        toast.success('Ürün başarıyla eklendi!');
      }
    } catch (err) {
      console.error('Ürün kaydedilirken hata:', err);
      toast.error(
        `Ürün kaydedilirken bir hata oluştu: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsModalOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleExportProducts = () => {
    try {
      const csvData = filteredProducts.map((product) => ({
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
        filaments: product.filaments ? JSON.stringify(product.filaments) : '',
      }));

      const csv = Papa.unparse(csvData, { header: true, delimiter: ',' });
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
    } catch (err) {
      console.error('Export hatası:', err);
      toast.error(
        `Dışarı aktarma sırasında bir hata oluştu: ${
          err instanceof Error ? err.message : 'Bilinmeyen hata'
        }`,
      );
    }
  };

  const handleImportProducts = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
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
                let filaments: any[] = [];
                if (row.filaments) {
                  try {
                    filaments = JSON.parse(row.filaments);
                  } catch {
                    filaments = [];
                  }
                }

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
                  filaments,
                };

                if (!apiData.productCode || !apiData.productType) {
                  errors.push(`${row.code || 'Bilinmeyen'}: Ürün kodu ve tipi gerekli`);
                  errorCount++;
                  continue;
                }

                const response = await fetch('/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(apiData),
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  errors.push(`${apiData.productCode}: ${errorData.error || 'Hata oluştu'}`);
                  errorCount++;
                } else {
                  successCount++;
                }
              } catch (err) {
                errors.push(`${row.code || 'Bilinmeyen'}: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
                errorCount++;
              }
            }

            if (errorCount > 0) {
              toast.warning(
                `${successCount} ürün eklendi, ${errorCount} hata oluştu. Detaylar için konsolu kontrol edin.`,
              );
              console.error('Import hataları:', errors);
            } else {
              toast.success(`${successCount} ürün başarıyla içeri aktarıldı!`);
            }

            const response = await fetch('/api/products');
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                setProductsList(data);
              }
            }
            setIsImportModalOpen(false);
          } catch (err) {
            console.error('Import işleme hatası:', err);
            toast.error(
              `İçeri aktarma sırasında bir hata oluştu: ${
                err instanceof Error ? err.message : 'Bilinmeyen hata'
              }`,
            );
          } finally {
            setIsImporting(false);
          }
        },
        error: (err) => {
          console.error('CSV parse hatası:', err);
          toast.error(`CSV dosyası okunamadı: ${err.message}`);
          setIsImporting(false);
        },
      });
    } catch (err) {
      console.error('Import hatası:', err);
      toast.error(
        `Dosya okuma hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`,
      );
      setIsImporting(false);
    }
  };

  const resetFilters = () =>
    setFilters({
      searchTerm: '',
      category: '',
      printTimeMin: '',
      printTimeMax: '',
      filamentType: '',
      filamentColor: '',
      stockStatus: '',
      totalGramMin: '',
      totalGramMax: '',
      stockMin: '',
      stockMax: '',
    });

  const formatDimensions = (product: ProductData) =>
    `${product.dimensionX}x${product.dimensionY}x${product.dimensionZ} mm`;

  return (
    <Layout>
      <div className="space-y-5 w-full">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Ürünler</h1>
          <div className="flex gap-3 items-center">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => {
                  setViewMode('grid');
                  setPage(1);
                }}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-secondary'}`}
                title="Kart Görünümü"
              >
                <Icons.GridIcon />
              </button>
              <button
                onClick={() => {
                  setViewMode('table');
                  setPage(1);
                }}
                className={`p-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-secondary'}`}
                title="Tablo Görünümü"
              >
                <Icons.ListIcon />
              </button>
            </div>

            {user?.type === 'admin' && (
              <div className="flex flex-wrap gap-2">
                <button onClick={handleExportProducts} className="btn-secondary flex items-center gap-2">
                  <Icons.DownloadIcon /> Dışarı Aktar
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Icons.UploadIcon /> İçeri Aktar
                </button>
                <button onClick={handleAddProduct} className="btn-primary flex items-center gap-2">
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

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filtreler */}
        <div className="bg-card border border-border p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="search-container flex-grow">
              <Icons.SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Ürün ara..."
                className="w-full"
                value={filters.searchTerm}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, searchTerm: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  showFilters
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-secondary border-border'
                }`}
              >
                <Icons.FilterIcon /> Filtreler
              </button>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Kategori:</label>
                <select
                  className="min-w-[140px] px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={filters.category}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, category: e.target.value }));
                    setPage(1);
                  }}
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Baskı Süresi (saat)
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Min"
                        value={filters.printTimeMin}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            printTimeMin: e.target.value === '' ? '' : parseFloat(e.target.value),
                          }))
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <span className="text-muted-foreground">-</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Max"
                        value={filters.printTimeMax}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            printTimeMax: e.target.value === '' ? '' : parseFloat(e.target.value),
                          }))
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Filament Tipi
                  </label>
                  <select
                    value={filters.filamentType}
                    onChange={(e) => setFilters((prev) => ({ ...prev, filamentType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Tümü</option>
                    {filamentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Stok Durumu
                  </label>
                  <select
                    value={filters.stockStatus}
                    onChange={(e) => setFilters((prev) => ({ ...prev, stockStatus: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Tümü</option>
                    <option value="stokta-var">Stokta Var</option>
                    <option value="stokta-yok">Stokta Yok</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Renk</label>
                  <select
                    value={filters.filamentColor}
                    onChange={(e) => setFilters((prev) => ({ ...prev, filamentColor: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Tümü</option>
                    {filamentColors.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Toplam Gramaj (g)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Min"
                      value={filters.totalGramMin}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          totalGramMin: e.target.value === '' ? '' : parseFloat(e.target.value),
                        }))
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Max"
                      value={filters.totalGramMax}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          totalGramMax: e.target.value === '' ? '' : parseFloat(e.target.value),
                        }))
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Stok Adedi
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Min"
                      value={filters.stockMin}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          stockMin: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Max"
                      value={filters.stockMax}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          stockMax: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors"
                >
                  Filtreleri Temizle
                </button>
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

        {/* Sayaçlar ve etiketler */}
        <div className="mb-2 py-1 border-b border-border flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <span>
              {filteredProducts.length} ürün
              {showPackages ? `, ${filteredPackages.length} paket` : ''}
            </span>
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
          <div className="flex flex-wrap gap-2 items-center">
            {filters.searchTerm && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Arama: "{filters.searchTerm}"
              </span>
            )}
            {filters.category && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Kategori: {filters.category}
              </span>
            )}
            {(filters.printTimeMin !== '' || filters.printTimeMax !== '') && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Baskı: {filters.printTimeMin !== '' ? filters.printTimeMin : '0'} -{' '}
                {filters.printTimeMax !== '' ? filters.printTimeMax : '∞'} saat
              </span>
            )}
            {filters.filamentType && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Filament: {filters.filamentType}
              </span>
            )}
            {filters.filamentColor && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Renk: {filters.filamentColor}
              </span>
            )}
            {(filters.totalGramMin !== '' || filters.totalGramMax !== '') && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Gram: {filters.totalGramMin !== '' ? filters.totalGramMin : '0'} -{' '}
                {filters.totalGramMax !== '' ? filters.totalGramMax : '∞'} g
              </span>
            )}
            {(filters.stockMin !== '' || filters.stockMax !== '') && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Adet: {filters.stockMin !== '' ? filters.stockMin : '0'} -{' '}
                {filters.stockMax !== '' ? filters.stockMax : '∞'}
              </span>
            )}
          </div>
        </div>

        {/* Liste */}
        {isLoading && !error ? (
          // 🚀 PERFORMANS: Skeleton Loading (Anında görsel geri bildirim)
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3">
            {Array.from({ length: GRID_PAGE_SIZE }).map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-card rounded-lg shadow-sm border border-border p-2 md:p-3 animate-pulse">
                <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-secondary rounded-md"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4"></div>
                  <div className="h-3 bg-secondary rounded w-1/2"></div>
                  <div className="h-3 bg-secondary rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3">
            {paginatedProducts.map((product) => (
              <div key={product.id} className="bg-card rounded-lg shadow-sm border border-border p-2 md:p-3">
                <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-secondary rounded-md overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.productType} className="w-full h-full object-contain" />
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
                            onClick={() => handleDeleteProduct(product.id!)}
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

            {showPackages &&
              filteredPackages.map((pkg) => (
                <div
                  key={`package-${pkg.id}`}
                  className="bg-card rounded-lg shadow-sm border-2 border-blue-300 border-dashed p-2 md:p-3"
                >
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
                      <p className="text-xs text-muted-foreground truncate">{pkg.items?.length || 0} ürün</p>
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
                {isLoading && !error ? (
                  // 🚀 PERFORMANS: Table Skeleton Loading
                  Array.from({ length: 10 }).map((_, index) => (
                    <tr key={`table-skeleton-${index}`} className="border-b border-border animate-pulse">
                      <td className="p-2"><div className="h-4 bg-secondary rounded w-20"></div></td>
                      <td className="p-2"><div className="h-4 bg-secondary rounded w-32"></div></td>
                      <td className="p-2"><div className="h-4 bg-secondary rounded w-24"></div></td>
                      <td className="p-2"><div className="h-4 bg-secondary rounded w-16"></div></td>
                      <td className="p-2"><div className="h-4 bg-secondary rounded w-20"></div></td>
                      <td className="p-2"><div className="h-4 bg-secondary rounded w-24"></div></td>
                    </tr>
                  ))
                ) : (
                  paginatedProducts.map((product) => (
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
                              onClick={() => handleDeleteProduct(product.id!)}
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
                  ))
                )}

                {!isLoading && showPackages &&
                  filteredPackages.map((pkg) => (
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

        {/* Sayfalama */}
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span>
            Sayfa {currentPage}/{totalPages} — {filteredProducts.length} ürün
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-border rounded disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border border-border rounded disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Ürün Ekle/Düzenle */}
      {isModalOpen && user?.type === 'admin' && (
        <ProductModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onSave={handleSaveProduct}
          product={selectedProduct}
          isNewProduct={!selectedProduct}
          productTypeOptions={productTypes}
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
                    {selectedPackage.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{item.productCode}</span>
                          <span className="text-sm text-muted-foreground ml-2">{item.productType}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">{item.quantity} adet</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              (item.availableStock ?? 0) >= item.quantity
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            Stok: {item.availableStock ?? 0}
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

              <form
                onSubmit={async (e) => {
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
                        items: packageItems.map((item) => ({
                          productId: parseInt(item.productId, 10),
                          quantity: item.quantity,
                        })),
                      }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Paket oluşturulamadı');
                    }

                    const result = await response.json();
                    toast.success(`Paket başarıyla oluşturuldu! (${result.package?.package_code || 'PAK-XXX'})`);

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
                  } catch (err) {
                    console.error('Paket oluşturma hatası:', err);
                    toast.error(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
                  } finally {
                    setIsPackageSubmitting(false);
                  }
                }}
              >
                <div className="space-y-4">
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

                  <div>
                    <label className="block text-sm font-semibold mb-2">Paket İçindeki Ürünler *</label>
                    <div className="space-y-3">
                      {packageItems.map((item, index) => {
                        const product = productsList.find((p) => p.id === item.productId);
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
                              onClick={() => setPackageItems(packageItems.filter((_, i) => i !== index))}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              disabled={isPackageSubmitting}
                            >
                              <Icons.TrashIcon className="w-5 h-5" />
                            </button>
                            {product && <span className="text-sm text-gray-600">Stok: {product.availableStock || 0}</span>}
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
                    if (fileInputRef.current) fileInputRef.current.value = '';
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
                  <p className="text-sm text-blue-800 mb-2">CSV dosyanız şu sütunları içermelidir:</p>
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
                  <label className="block text-sm font-semibold mb-2">CSV Dosyası Seç</label>
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
                  <p className="text-xs text-gray-500 mt-1">Sadece CSV dosyaları kabul edilir. Excel dosyalarını CSV olarak kaydedin.</p>
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
                    if (fileInputRef.current) fileInputRef.current.value = '';
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
          <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Ürün Detayı - {selectedProduct.code}</h2>
              <button onClick={() => setIsDetailOpen(false)} className="text-muted-foreground hover:text-foreground">
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <div
                    className="bg-muted rounded-md overflow-hidden mb-4 flex items-center justify-center"
                    style={{ minHeight: '300px', maxHeight: '500px' }}
                  >
                    {selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.code}
                        className="max-w-full max-h-full object-contain p-4"
                        style={{ maxWidth: '100%', maxHeight: '500px', width: 'auto', height: 'auto' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground min-h-[300px]">
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
                      <p>
                        Toplam: {selectedProduct.totalGram}g, Adet: {selectedProduct.pieceGram}g/adet
                      </p>
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
                {user?.type === 'admin' ? (
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
                ) : null}
              </div>

              {selectedProduct.notes && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2">Notlar</h4>
                  <div className="p-3 bg-muted rounded-md">{selectedProduct.notes}</div>
                </div>
              )}

              <div className="modal-footer mt-6">
                {user?.type === 'admin' && (
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleEditProduct(selectedProduct);
                    }}
                    className="btn-secondary"
                  >
                    Düzenle
                  </button>
                )}
                <button onClick={() => setIsDetailOpen(false)} className="btn-primary">
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

