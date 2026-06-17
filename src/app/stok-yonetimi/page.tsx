'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import StockOrdersPanel, { type StockProduct } from '../../components/stock/StockOrdersPanel';

interface User {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

type ModalType = 'delete' | null;

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Ürünler yüklenemedi');
    return res.json();
  });

export default function StokYonetimiPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rawProducts, error: swrError, isLoading, mutate } = useSWR<Record<string, unknown>[]>(
    '/api/products',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const products: StockProduct[] = (rawProducts || []).map((product) => ({
    id: String(product.id),
    code: String(product.code ?? ''),
    productType: String(product.productType ?? ''),
    availableStock: Number(product.availableStock) || 0,
    reservedStock: Number(product.reservedStock) || 0,
    totalStock: Number(product.totalStock) || 0,
    stockDisplay: String(product.stockDisplay ?? 'Stokta Yok'),
    stockColor: String(product.stockColor ?? 'text-red-600 bg-red-50'),
  }));

  const error = swrError?.message || null;

  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as User;
        setUser(userData);
        if (userData.type !== 'admin') router.push('/');
      } catch {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  const fetchProducts = useCallback(() => mutate(), [mutate]);

  const filteredProducts = products.filter(
    (p) =>
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.productType.toLowerCase().includes(productSearch.toLowerCase())
  );

  const openDeleteModal = (product: StockProduct) => {
    setSelectedProduct(product);
    setModalType('delete');
    setQuantity(1);
    setReason('');
    setNotes('');
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setSelectedProduct(null);
    setModalType(null);
  };

  const handleDeleteStock = async () => {
    if (!selectedProduct || quantity <= 0 || !reason) {
      alert('Lütfen miktar ve silme nedeni seçin.');
      return;
    }
    if (quantity > selectedProduct.availableStock) {
      alert(`Mevcut stoktan fazla silemezsiniz. Mevcut: ${selectedProduct.availableStock} adet`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inventory/reduce-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity,
          reason,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Stok silinemedi');
      }

      alert('Stok başarıyla güncellendi.');
      await fetchProducts();
      closeModal();
    } catch (err) {
      alert(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.type !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Icons.ClipboardIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Yetkisiz Erişim</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </p>
        </div>
      </Layout>
    );
  }

  if (isLoading) return <Layout><p>Yükleniyor...</p></Layout>;
  if (error) return <Layout><p>Hata: {error}</p></Layout>;

  return (
    <Layout>
      <div className="space-y-8 w-full">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Stok Yönetimi</h1>
          <button
            onClick={() => setIsCreateOrderOpen(true)}
            className="btn-primary flex items-center gap-2 text-sm shrink-0"
          >
            <Icons.Plus className="w-4 h-4" />
            Yeni Üretim Emri
          </button>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Stok Durumu</h2>
          <div className="bg-card border border-border p-4 rounded-lg">
            <div className="search-container">
              <Icons.SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Ürün kodu veya adına göre ara..."
                className="w-full"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto bg-card border border-border rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="p-2 text-left">Ürün Kodu</th>
                  <th className="p-2 text-left">Ürün Adı</th>
                  <th className="p-2 text-left">Mevcut Stok</th>
                  <th className="p-2 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="p-2 font-medium">{product.code}</td>
                    <td className="p-2">{product.productType}</td>
                    <td className="p-2">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${product.stockColor}`}>
                        <div className={`w-2 h-2 rounded-full ${
                          product.availableStock > 0
                            ? 'bg-green-500'
                            : product.reservedStock > 0
                              ? 'bg-blue-500'
                              : 'bg-red-500'
                        }`} />
                        {product.stockDisplay}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => openDeleteModal(product)}
                        className="btn-destructive text-sm"
                      >
                        Stok Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <StockOrdersPanel
          products={products}
          isProductsLoading={isLoading}
          onRefreshProducts={fetchProducts}
          isCreateModalOpen={isCreateOrderOpen}
          onCreateModalOpenChange={setIsCreateOrderOpen}
        />
      </div>

      {modalType === 'delete' && selectedProduct && (
        <div className="modal">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Stoktan Ürün Sil</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <div className="modal-body space-y-4">
              <p><span className="font-semibold">Ürün:</span> {selectedProduct.code} - {selectedProduct.productType}</p>
              <p><span className="font-semibold">Mevcut Stok:</span> {selectedProduct.availableStock} adet</p>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-1">Miktar</label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full"
                  min={1}
                />
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-1">Silme Nedeni</label>
                <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full">
                  <option value="">Seçiniz...</option>
                  <option value="fire">Fire</option>
                  <option value="kayip">Kayıp</option>
                  <option value="hatali_uretim">Hatalı Üretim</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-1">Notlar</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-24"
                  placeholder="Silme işlemiyle ilgili detaylar..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeModal} className="btn-secondary">İptal</button>
              <button onClick={handleDeleteStock} className="btn-destructive">Stoktan Sil</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
