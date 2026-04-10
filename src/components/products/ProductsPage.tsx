'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import useSWR from 'swr';
import Layout from '../Layout';
import { ProductData } from '../ProductModal';
import { Icons } from '../../utils/Icons';
import { useToast } from '../../contexts/ToastContext';
import { usePackageCreation } from '../../hooks/usePackageCreation';
import PackageCreationModal from './PackageCreationModal';
import ProductDetailModal from './ProductDetailModal';
import PackageDetailModal from './PackageDetailModal';
import ProductImportModal from './ProductImportModal';

const loadPapaParse = async () => {
  const Papa = await import('papaparse');
  return Papa.default;
};

const ProductModal = dynamic(() => import('../ProductModal'), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6">Yükleniyor...</div></div>,
  ssr: false,
});

interface LoggedInUser { id: string; name: string; type: 'admin' | 'customer'; }

interface PackageData {
  id: string; package_code: string; name: string; description?: string; price: number;
  items?: { productId: string; quantity: number; productCode?: string; productType?: string; availableStock?: number; }[];
}

interface Filters {
  searchTerm: string; category: string; printTimeMin: number | ''; printTimeMax: number | '';
  filamentType: string; filamentColor: string; stockStatus: string;
  totalGramMin: number | ''; totalGramMax: number | ''; stockMin: number | ''; stockMax: number | '';
}

const GRID_PAGE_SIZE = 24;
const TABLE_PAGE_SIZE = 50;
const BLUR_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==";

function buildProductsUrl(category: string) {
  return category
    ? `/api/products?category=${encodeURIComponent(category)}&all=true`
    : '/api/products?all=true';
}

async function fetchProducts(url: string): Promise<ProductData[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ürünler yüklenemedi: ${res.statusText}`);
  const d = await res.json();
  return Array.isArray(d) ? d : [];
}

const defaultFilters: Filters = {
  searchTerm: '', category: '', printTimeMin: '', printTimeMax: '',
  filamentType: '', filamentColor: '', stockStatus: '',
  totalGramMin: '', totalGramMax: '', stockMin: '', stockMax: '',
};

export default function ProductsPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showPackages, setShowPackages] = useState(true);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortBy, setSortBy] = useState<'alphabetical-asc' | 'alphabetical-desc' | 'newest' | 'oldest' | 'stock-high' | 'stock-low'>('alphabetical-asc');

  const productsUrl = buildProductsUrl(filters.category);
  const { data: productsData, error: productsError, isLoading: productsLoading, mutate: mutateProducts } = useSWR<ProductData[]>(
    productsUrl,
    fetchProducts,
    { revalidateOnFocus: false, dedupingInterval: 2000, refreshInterval: 0 }
  );

  // Tüm kategorileri ayrıca tutuyoruz - kategori dropdown'u için boşaltılmaz
  const { data: allProductsForCategories } = useSWR<ProductData[]>(
    '/api/products?all=true',
    fetchProducts,
    { revalidateOnFocus: false, dedupingInterval: 30000, refreshInterval: 0 }
  );

  const { data: packagesData, error: packagesError, isLoading: packagesLoading, mutate: mutatePackages } = useSWR<PackageData[]>(
    '/api/packages?includeItems=true',
    async (url: string) => { const res = await fetch(url); if (!res.ok) return []; const d = await res.json(); return Array.isArray(d) ? d : []; },
    { revalidateOnFocus: false, dedupingInterval: 2000, refreshInterval: 0 }
  );

  const { data: settingsData } = useSWR<Record<string, unknown>>(
    '/api/settings',
    async (url: string) => { const res = await fetch(url); if (!res.ok) return {}; return res.json(); },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const productsList = productsData || [];
  const packagesList = packagesData || [];
  const hiddenCategories: string[] = (settingsData?.hidden_categories as string[]) || [];
  const isLoading = productsLoading || packagesLoading;
  const error = productsError || packagesError ? (productsError?.message || packagesError?.message || 'Veri yükleme hatası') : null;

  const mutateAllProducts = () => {
    mutateProducts();
  };

  const pkgCreation = usePackageCreation(productsList, mutatePackages);

  useEffect(() => {
    const j = localStorage.getItem('loggedUser');
    if (j) { try { setUser(JSON.parse(j) as LoggedInUser); } catch {} }
  }, []);

  const filteredProducts = useMemo(() => {
    const s = filters.searchTerm.trim().toLowerCase();
    // Kategori filtresi artık sunucu tarafında uygulanıyor
    const filtered = productsList.filter((p) => {
      const pt = p.printTime || 0;
      if (filters.printTimeMin !== '' && pt < filters.printTimeMin) return false;
      if (filters.printTimeMax !== '' && pt > filters.printTimeMax) return false;
      if (filters.filamentType && !(p.filaments?.some(f => f.type?.toLowerCase() === filters.filamentType.toLowerCase()))) return false;
      if (filters.filamentColor && !(p.filaments?.some(f => f.color?.toLowerCase().includes(filters.filamentColor.toLowerCase())))) return false;
      const stock = p.availableStock ?? 0;
      if (filters.stockStatus === 'stokta-var' && stock <= 0) return false;
      if (filters.stockStatus === 'stokta-yok' && stock > 0) return false;
      if (filters.stockMin !== '' && stock < filters.stockMin) return false;
      if (filters.stockMax !== '' && stock > filters.stockMax) return false;
      const tg = p.totalGram ?? 0;
      if (filters.totalGramMin !== '' && tg < filters.totalGramMin) return false;
      if (filters.totalGramMax !== '' && tg > filters.totalGramMax) return false;
      if (s && !(p.code?.toLowerCase().includes(s) || p.productType?.toLowerCase().includes(s))) return false;
      if (user?.type !== 'admin' && hiddenCategories.includes(p.productType || '')) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical-asc': return (a.code || a.productType || '').localeCompare(b.code || b.productType || '', 'tr', { sensitivity: 'base' });
        case 'alphabetical-desc': return (b.code || b.productType || '').localeCompare(a.code || a.productType || '', 'tr', { sensitivity: 'base' });
        case 'newest': return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        case 'oldest': return (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        case 'stock-high': return (b.availableStock || 0) - (a.availableStock || 0);
        case 'stock-low': return (a.availableStock || 0) - (b.availableStock || 0);
        default: return 0;
      }
    });
  }, [filters, productsList, sortBy, hiddenCategories, user?.type]);

  const filteredPackages = useMemo(() => {
    const s = filters.searchTerm.trim().toLowerCase();
    return packagesList.filter(pkg => pkg.name?.toLowerCase().includes(s) || pkg.package_code?.toLowerCase().includes(s) || pkg.description?.toLowerCase().includes(s));
  }, [filters.searchTerm, packagesList]);

  const pageSize = viewMode === 'grid' ? GRID_PAGE_SIZE : TABLE_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allProductsList = allProductsForCategories || productsList;

  const categories = useMemo(() => {
    const all = Array.from(new Set(allProductsList.map(p => p.productType).filter(Boolean)));
    return user?.type === 'admin' ? all : all.filter(c => !hiddenCategories.includes(c));
  }, [allProductsList, hiddenCategories, user?.type]);

  const filamentTypes = useMemo(() => Array.from(new Set(productsList.flatMap(p => p.filaments?.map(f => f.type).filter(Boolean) || []))), [productsList]);
  const filamentColors = useMemo(() => Array.from(new Set(productsList.flatMap(p => p.filaments?.map(f => f.color).filter(Boolean) || []))), [productsList]);
  const productTypes = useMemo(() => Array.from(new Set(allProductsList.map(p => p.productType).filter(Boolean))), [allProductsList]);

  const handleEditProduct = (product: ProductData) => { setSelectedProduct({ ...product }); setIsModalOpen(true); };
  const handleShowDetails = (product: ProductData) => { setSelectedProduct(product); setIsDetailOpen(true); };

  const handleDuplicateProduct = async (product: ProductData) => {
    try {
      const r = await fetch('/api/products/duplicate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId: product.id }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Kopyalama başarısız'); }
      const d = await r.json();
      mutateProducts(prev => prev ? [...prev, d] : [d], false);
      setSelectedProduct(d); setIsModalOpen(true);
    } catch (e) { toast.error(`Ürün kopyalanamadı: ${e instanceof Error ? e.message : String(e)}`); }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      const r = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `API hatası: ${r.status}`);
      mutateProducts(prev => prev ? prev.filter(i => i.id !== productId) : [], false);
      toast.success('Ürün başarıyla silindi!');
    } catch (e) { toast.error(`Ürün silinirken hata: ${e instanceof Error ? e.message : String(e)}`); }
  };

  const handleSaveProduct = async (productData: ProductData) => {
    try {
      const payload = {
        ...(selectedProduct ? { id: selectedProduct.id } : {}),
        productCode: productData.code, productType: productData.productType, imagePath: productData.image,
        barcode: productData.barcode, capacity: productData.capacity,
        dimensionX: productData.dimensionX, dimensionY: productData.dimensionY, dimensionZ: productData.dimensionZ,
        printTime: productData.printTime, totalGram: productData.totalGram, pieceGram: productData.pieceGram,
        filePath: productData.filePath, notes: productData.notes, filaments: productData.filaments,
      };
      const r = await fetch('/api/products', {
        method: selectedProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({ error: 'Cevap parse edilemedi' })); throw new Error(`API hatası: ${r.status} - ${JSON.stringify(e)}`); }
      const rd = await r.json();
      const fp = rd.product?.product_code ? {
        id: rd.product.id, code: rd.product.product_code, productType: rd.product.product_type,
        image: rd.product.image_path, barcode: rd.product.barcode || '', capacity: rd.product.capacity || 0,
        dimensionX: rd.product.dimension_x || 0, dimensionY: rd.product.dimension_y || 0, dimensionZ: rd.product.dimension_z || 0,
        printTime: rd.product.print_time || 0, totalGram: rd.product.total_gram || 0, pieceGram: rd.product.piece_gram || 0,
        filePath: rd.product.file_path, notes: rd.product.notes || '',
        availableStock: selectedProduct ? (productsList.find(p => p.id === selectedProduct.id)?.availableStock || 0) : 0,
        filaments: productData.filaments || [],
      } : rd;

      if (selectedProduct) {
        mutateProducts(prev => prev ? prev.map(i => i.id === selectedProduct.id ? fp : i) : [], false);
      } else {
        mutateProducts(prev => prev ? [...prev, fp] : [fp], false);
      }
      mutateProducts();
      toast.success(selectedProduct ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!');
    } catch (e) { toast.error(`Ürün kaydedilirken hata: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setIsModalOpen(false); setSelectedProduct(null); }
  };

  const handleExportProducts = async () => {
    try {
      const Papa = await loadPapaParse();
      const csv = Papa.unparse(filteredProducts.map(p => ({
        code: p.code || '', productType: p.productType || '', image: p.image || '',
        barcode: p.barcode || '', capacity: p.capacity || 0, dimensionX: p.dimensionX || 0,
        dimensionY: p.dimensionY || 0, dimensionZ: p.dimensionZ || 0, printTime: p.printTime || 0,
        totalGram: p.totalGram || 0, pieceGram: p.pieceGram || 0, filePath: p.filePath || '',
        notes: p.notes || '', filaments: p.filaments ? JSON.stringify(p.filaments) : '',
      })), { header: true, delimiter: ',' });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `urunler_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.success(`${filteredProducts.length} ürün dışarı aktarıldı!`);
    } catch (e) { toast.error(`Dışarı aktarma hatası: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`); }
  };

  const handleImportProducts = async (file: File) => {
    setIsImporting(true);
    try {
      const Papa = await loadPapaParse();
      const text = await file.text();
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        complete: async (results) => {
          try {
            let ok = 0, fail = 0;
            for (const row of results.data as Record<string, string>[]) {
              try {
                let filaments: unknown[] = [];
                try { if (row.filaments) filaments = JSON.parse(row.filaments); } catch {}
                const d = { productCode: row.code || row.productCode || '', productType: row.productType || row.product_type || '', imagePath: row.image || null, barcode: row.barcode || null, capacity: parseInt(row.capacity) || 0, dimensionX: parseFloat(row.dimensionX || row.dimension_x) || 0, dimensionY: parseFloat(row.dimensionY || row.dimension_y) || 0, dimensionZ: parseFloat(row.dimensionZ || row.dimension_z) || 0, printTime: parseFloat(row.printTime || row.print_time) || 0, totalGram: parseFloat(row.totalGram || row.total_gram) || 0, pieceGram: parseFloat(row.pieceGram || row.piece_gram) || 0, filePath: row.filePath || null, notes: row.notes || null, filaments };
                if (!d.productCode || !d.productType) { fail++; continue; }
                const r = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
                if (!r.ok) { fail++; } else { ok++; }
              } catch { fail++; }
            }
            if (fail > 0) toast.warning(`${ok} ürün eklendi, ${fail} hata.`);
            else toast.success(`${ok} ürün içeri aktarıldı!`);
            mutateProducts(); setIsImportModalOpen(false);
          } catch (e) { toast.error(`Import hatası: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`); }
          finally { setIsImporting(false); }
        },
        error: (e: Error) => { toast.error(`CSV parse hatası: ${e.message}`); setIsImporting(false); },
      });
    } catch (e) { toast.error(`Dosya okuma hatası: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`); setIsImporting(false); }
  };

  const formatDimensions = (p: ProductData) => `${p.dimensionX}x${p.dimensionY}x${p.dimensionZ} mm`;
  const isAdmin = user?.type === 'admin';

  return (
    <Layout>
      <div className="space-y-5 w-full">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Ürünler</h1>
          <div className="flex gap-3 items-center">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button onClick={() => { setViewMode('grid'); setPage(1); }} className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-secondary'}`} title="Kart"><Icons.GridIcon /></button>
              <button onClick={() => { setViewMode('table'); setPage(1); }} className={`p-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-secondary'}`} title="Tablo"><Icons.ListIcon /></button>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button onClick={handleExportProducts} className="btn-secondary flex items-center gap-2"><Icons.DownloadIcon /> Dışarı Aktar</button>
                <button onClick={() => setIsImportModalOpen(true)} className="btn-secondary flex items-center gap-2"><Icons.UploadIcon /> İçeri Aktar</button>
                <button onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2"><Icons.PlusIcon /> Yeni Ürün</button>
                <button onClick={pkgCreation.openPackageModal} className="btn-primary flex items-center gap-2"><Icons.Plus /> Paket Oluştur</button>
              </div>
            )}
          </div>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Filters */}
        <div className="bg-card border border-border p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="search-container flex-grow w-full sm:w-auto">
              <Icons.SearchIcon className="search-icon" />
              <input type="text" placeholder="Ürün ara..." className="w-full" value={filters.searchTerm} onChange={e => { setFilters(p => ({ ...p, searchTerm: e.target.value })); setPage(1); }} />
            </div>
            <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto justify-end">
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="text-sm font-medium text-foreground whitespace-nowrap">Sırala:</label>
                <select className="min-w-[180px] px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" value={sortBy} onChange={e => { setSortBy(e.target.value as typeof sortBy); setPage(1); }}>
                  <option value="alphabetical-asc">Alfabetik (A-Z)</option>
                  <option value="alphabetical-desc">Alfabetik (Z-A)</option>
                  <option value="newest">En Yeni</option>
                  <option value="oldest">En Eski</option>
                  <option value="stock-high">Stok (Yüksekten Düşüğe)</option>
                  <option value="stock-low">Stok (Düşükten Yükseğe)</option>
                </select>
              </div>
              <button onClick={() => setShowFilters(p => !p)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all flex-shrink-0 ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-secondary border-border'}`}><Icons.FilterIcon /> Filtreler</button>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Kategori:</label>
                <select className="min-w-[140px] px-3 py-2 rounded-lg border border-border bg-card text-sm" value={filters.category} onChange={e => { setFilters(p => ({ ...p, category: e.target.value })); setPage(1); }}>
                  <option value="">Tüm Kategoriler</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Baskı Süresi (saat)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" step="0.1" placeholder="Min" value={filters.printTimeMin} onChange={e => setFilters(p => ({ ...p, printTimeMin: e.target.value === '' ? '' : parseFloat(e.target.value) }))} className="flex-1 px-3 py-2 rounded-lg border border-border bg-card" />
                    <span className="text-muted-foreground">-</span>
                    <input type="number" min="0" step="0.1" placeholder="Max" value={filters.printTimeMax} onChange={e => setFilters(p => ({ ...p, printTimeMax: e.target.value === '' ? '' : parseFloat(e.target.value) }))} className="flex-1 px-3 py-2 rounded-lg border border-border bg-card" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Filament Tipi</label>
                  <select value={filters.filamentType} onChange={e => setFilters(p => ({ ...p, filamentType: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-card">
                    <option value="">Tümü</option>
                    {filamentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Stok Durumu</label>
                  <select value={filters.stockStatus} onChange={e => setFilters(p => ({ ...p, stockStatus: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-card">
                    <option value="">Tümü</option>
                    <option value="stokta-var">Stokta Var</option>
                    <option value="stokta-yok">Stokta Yok</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Renk</label>
                  <select value={filters.filamentColor} onChange={e => setFilters(p => ({ ...p, filamentColor: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-card">
                    <option value="">Tümü</option>
                    {filamentColors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Toplam Gramaj (g)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" placeholder="Min" value={filters.totalGramMin} onChange={e => setFilters(p => ({ ...p, totalGramMin: e.target.value === '' ? '' : parseFloat(e.target.value) }))} className="flex-1 px-3 py-2 rounded-lg border border-border bg-card" />
                    <span>-</span>
                    <input type="number" min="0" placeholder="Max" value={filters.totalGramMax} onChange={e => setFilters(p => ({ ...p, totalGramMax: e.target.value === '' ? '' : parseFloat(e.target.value) }))} className="flex-1 px-3 py-2 rounded-lg border border-border bg-card" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">Stok Adedi</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" placeholder="Min" value={filters.stockMin} onChange={e => setFilters(p => ({ ...p, stockMin: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))} className="flex-1 px-3 py-2 rounded-lg border border-border bg-card" />
                    <span>-</span>
                    <input type="number" min="0" placeholder="Max" value={filters.stockMax} onChange={e => setFilters(p => ({ ...p, stockMax: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }))} className="flex-1 px-3 py-2 rounded-lg border border-border bg-card" />
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setFilters(defaultFilters)} className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg">Filtreleri Temizle</button>
                <button onClick={() => setShowFilters(false)} className="px-4 py-2 text-sm bg-card hover:bg-secondary border border-border rounded-lg">Filtreleri Gizle</button>
              </div>
            </div>
          )}
        </div>

        {/* Counters */}
        <div className="mb-2 py-1 border-b border-border flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <span>{filteredProducts.length} ürün{showPackages ? `, ${filteredPackages.length} paket` : ''}</span>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showPackages} onChange={e => setShowPackages(e.target.checked)} className="w-4 h-4" /><span>Paketleri göster</span></label>
          </div>
        </div>

        {/* Product List */}
        {isLoading && !error ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3">
            {Array.from({ length: GRID_PAGE_SIZE }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg shadow-sm border border-border p-2 md:p-3 animate-pulse">
                <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-secondary rounded-md" />
                <div className="space-y-2"><div className="h-4 bg-secondary rounded w-3/4" /><div className="h-3 bg-secondary rounded w-1/2" /><div className="h-3 bg-secondary rounded w-full" /></div>
              </div>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3">
            {paginatedProducts.map(product => (
              <div key={product.id} className="bg-card rounded-lg shadow-sm border border-border p-2 md:p-3">
                <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-secondary rounded-md overflow-hidden">
                  {product.image ? (
                    <Image src={product.image} alt={product.productType || 'Ürün'} fill sizes="(max-width: 640px) 50vw, 200px" className="object-contain" loading="lazy" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Görsel Yok</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs md:text-sm truncate">{product.code}</h3>
                      <p className="text-xs text-muted-foreground truncate">{product.productType}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleShowDetails(product)} className="p-0.5 md:p-1 hover:text-primary" title="Detay"><Icons.EyeIcon className="w-3 h-3 md:w-4 md:h-4" /></button>
                      {isAdmin && (<>
                        <button onClick={() => handleEditProduct(product)} className="p-0.5 md:p-1 hover:text-primary" title="Düzenle"><Icons.EditIcon className="w-3 h-3 md:w-4 md:h-4" /></button>
                        <button onClick={() => handleDuplicateProduct(product)} className="p-0.5 md:p-1 hover:text-primary" title="Kopyala"><Icons.ClipboardIcon className="w-3 h-3 md:w-4 md:h-4" /></button>
                        <button onClick={() => handleDeleteProduct(product.id!)} className="p-0.5 md:p-1 hover:text-destructive" title="Sil"><Icons.TrashIcon className="w-3 h-3 md:w-4 md:h-4" /></button>
                      </>)}
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
            {showPackages && filteredPackages.map(pkg => (
              <div key={`pkg-${pkg.id}`} className="bg-card rounded-lg shadow-sm border-2 border-blue-300 border-dashed p-2 md:p-3">
                <div className="relative aspect-[4/3] max-h-32 md:max-h-36 mb-2 bg-blue-50 rounded-md flex items-center justify-center">
                  <div className="text-center text-blue-600"><Icons.PackageIcon className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1" /><span className="text-xs font-semibold">PAKET</span></div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex-1 min-w-0"><h3 className="font-medium text-xs md:text-sm truncate">{pkg.package_code}</h3><p className="text-xs text-muted-foreground truncate">{pkg.name}</p></div>
                    <button onClick={() => setSelectedPackage(pkg)} className="p-0.5 md:p-1 hover:text-primary" title="Detay"><Icons.EyeIcon className="w-3 h-3 md:w-4 md:h-4" /></button>
                  </div>
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-primary truncate">Fiyat: {pkg.price}₺</p>
                    <p className="text-muted-foreground truncate">{pkg.items?.length || 0} ürün</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="bg-secondary">
                <th className="p-2 text-left">Kod</th><th className="p-2 text-left">Tür</th><th className="p-2 text-left">Boyutlar</th>
                <th className="p-2 text-left">Kapasite</th><th className="p-2 text-left">Baskı Süresi</th><th className="p-2 text-left">İşlemler</th>
              </tr></thead>
              <tbody>
                {paginatedProducts.map(product => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="p-2">{product.code}</td><td className="p-2">{product.productType}</td>
                    <td className="p-2">{formatDimensions(product)}</td><td className="p-2">{product.capacity} adet/tabla</td>
                    <td className="p-2">{product.printTime} saat</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleShowDetails(product)} className="p-1 hover:text-primary"><Icons.EyeIcon /></button>
                        {isAdmin && (<>
                          <button onClick={() => handleEditProduct(product)} className="p-1 hover:text-primary"><Icons.EditIcon /></button>
                          <button onClick={() => handleDuplicateProduct(product)} className="p-1 hover:text-primary"><Icons.ClipboardIcon /></button>
                          <button onClick={() => handleDeleteProduct(product.id!)} className="p-1 hover:text-destructive"><Icons.TrashIcon /></button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))}
                {showPackages && filteredPackages.map(pkg => (
                  <tr key={`pkg-${pkg.id}`} className="border-b border-border bg-blue-50/30">
                    <td className="p-2"><span className="font-mono">{pkg.package_code}</span> <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">PAKET</span></td>
                    <td className="p-2">{pkg.name}</td><td className="p-2">-</td><td className="p-2">{pkg.items?.length || 0} ürün</td><td className="p-2">-</td>
                    <td className="p-2"><button onClick={() => setSelectedPackage(pkg)} className="p-1 hover:text-primary"><Icons.EyeIcon /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span>Sayfa {currentPage}/{totalPages} — {filteredProducts.length} ürün</span>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border border-border rounded disabled:opacity-50">Önceki</button>
            <button disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 border border-border rounded disabled:opacity-50">Sonraki</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && isAdmin && (
        <ProductModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }} onSave={handleSaveProduct} product={selectedProduct} isNewProduct={!selectedProduct} productTypeOptions={productTypes} />
      )}

      <ProductDetailModal product={selectedProduct} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onEdit={(p) => { setIsDetailOpen(false); handleEditProduct(p); }} isAdmin={isAdmin} />

      <PackageDetailModal pkg={selectedPackage} onClose={() => setSelectedPackage(null)} />

      {pkgCreation.isPackageModalOpen && isAdmin && (
        <PackageCreationModal
          isOpen={pkgCreation.isPackageModalOpen} onClose={pkgCreation.closePackageModal}
          packageStep={pkgCreation.packageStep} setPackageStep={pkgCreation.setPackageStep}
          packageName={pkgCreation.packageName} setPackageName={pkgCreation.setPackageName}
          packagePrice={pkgCreation.packagePrice} setPackagePrice={pkgCreation.setPackagePrice}
          packageDescription={pkgCreation.packageDescription} setPackageDescription={pkgCreation.setPackageDescription}
          targetWeightGram={pkgCreation.targetWeightGram} setTargetWeightGram={pkgCreation.setTargetWeightGram}
          tolerancePercent={pkgCreation.tolerancePercent} setTolerancePercent={pkgCreation.setTolerancePercent}
          contentMode={pkgCreation.contentMode} setContentMode={pkgCreation.setContentMode}
          varietyCount={pkgCreation.varietyCount} setVarietyCount={pkgCreation.setVarietyCount}
          quantityPerVariety={pkgCreation.quantityPerVariety} setQuantityPerVariety={pkgCreation.setQuantityPerVariety}
          varietyProductIds={pkgCreation.varietyProductIds} setVarietyProductIds={pkgCreation.setVarietyProductIds}
          packageItems={pkgCreation.packageItems} setPackageItems={pkgCreation.setPackageItems}
          forceCreateOutOfTolerance={pkgCreation.forceCreateOutOfTolerance} setForceCreateOutOfTolerance={pkgCreation.setForceCreateOutOfTolerance}
          isPackageSubmitting={pkgCreation.isPackageSubmitting} onSubmit={() => pkgCreation.submitPackage(toast)}
          packageItemsForApi={pkgCreation.packageItemsForApi} packageTotalGram={pkgCreation.packageTotalGram}
          toleranceMin={pkgCreation.toleranceMin} toleranceMax={pkgCreation.toleranceMax}
          isWithinTolerance={pkgCreation.isWithinTolerance} hasPackageContent={pkgCreation.hasPackageContent}
          productsList={productsList}
        />
      )}

      <ProductImportModal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); if (fileInputRef.current) fileInputRef.current.value = ''; }} onImport={handleImportProducts} isImporting={isImporting} fileInputRef={fileInputRef} />
    </Layout>
  );
}
