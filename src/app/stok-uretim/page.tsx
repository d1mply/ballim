'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';

// Ürün tipi
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

// Stok üretim emri tipi
interface StockProductionOrder {
  id: number;
  orderCode: string;
  status: string;
  orderDate: string;
  notes: string;
  products: Array<{
    id: number;
    productCode: string;
    productName: string;
    quantity: number;
    status: string;
  }>;
}

// Kullanıcı tipi
interface User {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

export default function StokUretimPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockOrders, setStockOrders] = useState<StockProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kullanıcı kontrolü ve admin yetkisi
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as User;
        setUser(userData);
        
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

  // Ürünleri yükle
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      console.log('📦 Ürünler yükleniyor...');
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Ürünler yüklenemedi');
      }
      const data = await response.json();
      console.log('📦 API\'den gelen ürünler:', data);
      
      if (!Array.isArray(data)) {
        console.error('❌ Ürünler bir array değil:', data);
        setProducts([]);
        return;
      }
      
      const formattedProducts = data.map((product: any) => ({
        id: String(product.id), // ID'yi string'e çevir
        code: product.code,
        productType: product.productType,
        availableStock: product.availableStock || 0,
        reservedStock: product.reservedStock || 0,
        totalStock: product.totalStock || 0,
        stockDisplay: product.stockDisplay || 'Stokta Yok',
        stockColor: product.stockColor || 'text-red-600 bg-red-50'
      }));
      
      console.log('✅ Formatlanmış ürünler:', formattedProducts);
      setProducts(formattedProducts);
    } catch (err) {
      console.error('❌ Ürün yükleme hatası:', err);
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Stok üretim emirlerini yükle (STK- prefix'li)
  const fetchStockOrders = async () => {
    try {
      setIsOrderLoading(true);
      const response = await fetch('/api/orders/production');
      if (!response.ok) {
        throw new Error('Üretim emirleri yüklenemedi');
      }
      const result = await response.json();
      
      // STK- prefix'li siparişleri filtrele
      const stockProductionOrders = (result.data || []).filter((order: any) => 
        order.order_code && order.order_code.startsWith('STK-')
      );
      
      const formattedOrders: StockProductionOrder[] = stockProductionOrders.map((order: any) => ({
        id: order.id,
        orderCode: order.order_code,
        status: order.status,
        orderDate: order.order_date,
        notes: order.notes || '',
        products: Array.isArray(order.products) ? order.products.map((p: any) => ({
          id: p.id,
          productCode: p.product_code,
          productName: p.product_name,
          quantity: p.quantity || 0,
          status: p.status || 'onay_bekliyor'
        })) : []
      }));
      
      setStockOrders(formattedOrders);
    } catch (err) {
      console.error('Stok üretim emirleri yüklenirken hata:', err);
    } finally {
      setIsOrderLoading(false);
    }
  };

  useEffect(() => {
    if (user?.type === 'admin') {
      fetchProducts();
      fetchStockOrders();
    }
  }, [user]);

  // Otomatik yenileme (her 30 saniyede bir)
  useEffect(() => {
    if (user?.type === 'admin') {
      const interval = setInterval(() => {
        fetchStockOrders();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Üretim emri oluştur
  const handleCreateOrder = async () => {
    if (!selectedProduct || quantity <= 0) {
      alert('Lütfen ürün ve adet seçin.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Sistem müşterisini kontrol et/oluştur
      await fetch('/api/customers/system');
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: null,
          customerName: 'STOK',
          products: [{
            productId: parseInt(selectedProduct.id, 10), // String'i number'a çevir
            quantity: quantity,
            unitPrice: 0
          }],
          orderType: 'stock_production',
          notes: notes || 'Stok Üretim sayfasından oluşturuldu'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Üretim emri oluşturulamadı');
      }

      const result = await response.json();
      alert(`Üretim emri başarıyla oluşturuldu! (${result.order?.order_code || 'STK-XXX'})`);
      
      // Modal'ı kapat ve formu sıfırla
      setIsModalOpen(false);
      setSelectedProduct(null);
      setQuantity(1);
      setNotes('');
      
      // Listeyi yenile
      await fetchStockOrders();
      await fetchProducts();
    } catch (error) {
      console.error('Üretim emri hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu';
      alert(`Hata: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal açma
  const openModal = () => {
    setIsModalOpen(true);
    setSelectedProduct(null);
    setQuantity(1);
    setNotes('');
  };

  // Durum rengi
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('onay') || statusLower.includes('bekliyor')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (statusLower.includes('üretim') || statusLower.includes('uretiliyor')) {
      return 'bg-blue-100 text-blue-800';
    } else if (statusLower.includes('üretildi') || statusLower.includes('uretildi')) {
      return 'bg-purple-100 text-purple-800';
    } else if (statusLower.includes('hazır') || statusLower.includes('hazirlandi')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Filtrelenmiş ürünler (sadece ana sayfa için)
  const filteredProducts = products.filter(p =>
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.productType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrelenmiş siparişler
  const filteredOrders = stockOrders.filter(order =>
    order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.products.some(p => 
      p.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (user?.type !== 'admin') {
    return null;
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Başlık */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Stok Üretim</h1>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Icons.Plus className="w-5 h-5" />
            Yeni Üretim Emri
          </button>
        </div>

        {/* Arama */}
        <div className="relative">
          <Icons.SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Üretim emri veya ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Üretim Emirleri Listesi */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Üretim Emirleri</h2>
          </div>
          
          {isOrderLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Yükleniyor...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Henüz stok üretim emri oluşturulmamış.</p>
              <p className="text-sm mt-2">Yeni üretim emri oluşturmak için yukarıdaki butona tıklayın.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Emir Kodu</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ürün</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Adet</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Durum</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tarih</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-primary">{order.orderCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {order.products.map((product) => (
                            <div key={product.id} className="text-sm">
                              <span className="font-medium">{product.productName}</span>
                              <span className="text-gray-500 ml-2">({product.productCode})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {order.products.map((product) => (
                            <div key={product.id} className="text-sm font-medium">
                              {product.quantity} adet
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {order.products.map((product) => (
                            <span
                              key={product.id}
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}
                            >
                              {product.status}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(order.orderDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push('/uretim-takip')}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          Üretim Takip →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Üretim Emri Oluşturma Modalı */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Yeni Stok Üretim Emri</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isSubmitting}
                  >
                    <Icons.XIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Ürün Seçimi */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Ürün Seç</label>
                    {isLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Ürünler yükleniyor...</p>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 font-medium">Ürün bulunamadı</p>
                        <button
                          type="button"
                          onClick={() => fetchProducts()}
                          className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 underline"
                        >
                          Tekrar Dene
                        </button>
                      </div>
                    ) : (
                      <select
                        value={selectedProduct?.id || ''}
                        onChange={(e) => {
                          const productId = e.target.value;
                          const product = products.find(p => String(p.id) === productId);
                          console.log('🔍 Seçilen ürün:', productId, product);
                          setSelectedProduct(product || null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={isSubmitting}
                      >
                        <option value="">Ürün seçin...</option>
                        {products.map((product) => (
                          <option key={product.id} value={String(product.id)}>
                            {product.code} - {product.productType} (Stok: {product.availableStock})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Adet */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Adet</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Notlar */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Notlar (Opsiyonel)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Üretim amacı, özel notlar vb..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Seçili Ürün Bilgisi */}
                  {selectedProduct && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Seçili Ürün Bilgisi</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Ürün Kodu:</span>
                          <span className="ml-2 font-medium">{selectedProduct.code}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Ürün Tipi:</span>
                          <span className="ml-2 font-medium">{selectedProduct.productType}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Mevcut Stok:</span>
                          <span className="ml-2 font-medium">{selectedProduct.availableStock} adet</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Rezerve Stok:</span>
                          <span className="ml-2 font-medium">{selectedProduct.reservedStock} adet</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Butonlar */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleCreateOrder}
                    disabled={!selectedProduct || quantity <= 0 || isSubmitting}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Oluşturuluyor...' : 'Üretim Emri Oluştur'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

