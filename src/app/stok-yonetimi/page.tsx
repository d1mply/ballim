'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';

// Product arayüzü - Basitleştirilmiş
interface Product {
  id: string;
  code: string;
  productType: string;
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  stockDisplay: string;
  stockColor: string;
}

// Kullanıcı tipi
interface User {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

// Modal türlerini tanımla
type ModalType = 'produce' | 'delete' | null;

export default function StokYonetimiPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kullanıcı kontrolü ve admin yetkisi
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as User;
        setUser(userData);
        
        // Admin değilse ana sayfaya yönlendir
        if (userData.type !== 'admin') {
          router.push('/');
        }
      } catch (error) {
        console.error('Kullanıcı bilgisi yüklenirken hata:', error);
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  // Ürünleri API'den çek - Basitleştirilmiş
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Ürünler yüklenemedi');
      }
      const data = await response.json();
      
      // Yeni stok sistemi ile uyumlu hale getir
      const formattedProducts = data.map((product: any) => ({
        id: product.id,
        code: product.code,
        productType: product.productType,
        availableStock: product.availableStock || 0,
        reservedStock: product.reservedStock || 0,
        totalStock: product.totalStock || 0,
        stockDisplay: product.stockDisplay || 'Stokta Yok',
        stockColor: product.stockColor || 'text-red-600 bg-red-50'
      }));
      
      setProducts(formattedProducts);
      setFilteredProducts(formattedProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Arama işlemini gerçekleştir
  useEffect(() => {
    const results = products.filter(p =>
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productType.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(results);
  }, [searchTerm, products]);

  // Modal'ı açan fonksiyon
  const openModal = (type: ModalType, product: Product) => {
    setSelectedProduct(product);
    setModalType(type);
    setQuantity(1);
    setReason('');
    setNotes('');
  };

  // Modal'ı kapatan fonksiyon
  const closeModal = () => {
    if (isSubmitting) return; // İşlem sırasında kapatmayı engelle
    setSelectedProduct(null);
    setModalType(null);
  };

  // Stok üretme işlemini tetikle - Üretim Emri Oluştur
  const handleProduceStock = async () => {
    if (!selectedProduct || quantity <= 0) return;
    setIsSubmitting(true);
    try {
      console.log('📦 Üretim emri oluşturuluyor:', {
        productId: selectedProduct.id,
        quantity,
        notes: notes || 'Stok Yönetimi sayfasından üretim emri'
      });
      
      // Önce sistem kullanıcısını kontrol et/oluştur
      await fetch('/api/customers/system');
      
      // Üretim emri oluştur (Sipariş olarak)
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: null, // Stok üretimi için müşteri yok
          customerName: 'STOK', // Müşteri adı olarak STOK göster
          products: [{
            productId: selectedProduct.id,
            quantity: quantity,
            unitPrice: 0 // Stok üretimi için fiyat 0
          }],
          orderType: 'stock_production',
          notes: `STOK ÜRETİM EMRİ | ${notes || 'Stok Yönetimi sayfasından oluşturuldu'}`
        }),
      });

      console.log('📡 API yanıtı:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API hatası:', errorData);
        throw new Error(errorData.details || errorData.error || 'Üretim emri oluşturulamadı');
      }

      const result = await response.json();
      console.log('✅ Üretim emri oluşturuldu:', result);
      
      alert('Üretim emri başarıyla oluşturuldu! Üretim Takip sayfasından takip edebilirsiniz.');
      await fetchProducts(); // Ürünleri yenile
      closeModal();
    } catch (error) {
      console.error('❌ Üretim emri hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu';
      alert(`Hata: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stok silme işlemini tetikle - Basitleştirilmiş
  const handleDeleteStock = async () => {
    if (!selectedProduct || quantity <= 0 || !reason) {
      alert('Lütfen miktar ve silme nedeni seçin.');
      return;
    }
    if (quantity > selectedProduct.availableStock) {
      alert(`Mevcut stoktan daha fazla ürün silemezsiniz. Mevcut stok: ${selectedProduct.availableStock} adet`);
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
      await fetchProducts(); // Ürünleri yenile
      closeModal();
    } catch (error) {
      console.error('Stok silme hatası:', error);
      alert(`Hata: ${error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin kontrolü - sadece admin kullanıcıları erişebilir
  if (user?.type !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Icons.ClipboardIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Yetkisiz Erişim</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. 
            Lütfen bir yönetici hesabıyla giriş yapın.
          </p>
        </div>
      </Layout>
    );
  }

  if (isLoading) return <Layout><p>Yükleniyor...</p></Layout>;
  if (error) return <Layout><p>Hata: {error}</p></Layout>;

  return (
    <Layout>
      <div className="space-y-5 w-full">
        <h1 className="text-xl font-bold">Stok Yönetimi</h1>
        
        <div className="bg-card border border-border p-4 rounded-lg">
          <div className="search-container">
            <Icons.SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Ürün kodu veya adına göre ara..."
              className="w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
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
                        product.availableStock > 0 ? 'bg-green-500' : product.reservedStock > 0 ? 'bg-blue-500' : 'bg-red-500'
                      }`}></div>
                      {product.stockDisplay}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openModal('produce', product)} className="btn-primary text-sm">Üretim Emri Oluştur</button>
                      <button onClick={() => openModal('delete', product)} className="btn-destructive text-sm">Stok Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalType && selectedProduct && (
        <div className="modal">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">
                {modalType === 'produce' ? 'Üretim Emri Oluştur' : 'Stoktan Ürün Sil'}
              </h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <div className="modal-body space-y-4">
              <p><span className='font-semibold'>Ürün:</span> {selectedProduct.code} - {selectedProduct.productType}</p>
              <p><span className='font-semibold'>Stok Durumu:</span> {selectedProduct.stockDisplay}</p>
              <p><span className='font-semibold'>Mevcut Stok:</span> {selectedProduct.availableStock} adet</p>
              <p><span className='font-semibold'>Rezerve:</span> {selectedProduct.reservedStock} adet</p>
              
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-1">Miktar</label>
                <input 
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className='w-full'
                  min={1}
                />
              </div>

              {modalType === 'delete' && (
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium mb-1">Silme Nedeni</label>
                  <select 
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className='w-full'
                  >
                    <option value="">Seçiniz...</option>
                    <option value="fire">Fire</option>
                    <option value="kayip">Kayıp</option>
                    <option value="hatali_uretim">Hatalı Üretim</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-1">Notlar</label>
                <textarea 
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className='w-full h-24'
                  placeholder={modalType === 'produce' ? 'Üretim emri için notlar...' : 'Silme işlemiyle ilgili detaylar...'}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeModal} className="btn-secondary">İptal</button>
              <button 
                onClick={modalType === 'produce' ? handleProduceStock : handleDeleteStock}
                className={modalType === 'produce' ? 'btn-primary' : 'btn-destructive'}
              >
                {modalType === 'produce' ? 'Üretim Emri Oluştur' : 'Stoktan Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
