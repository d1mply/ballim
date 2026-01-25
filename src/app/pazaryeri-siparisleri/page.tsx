'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import { useToast } from '../../contexts/ToastContext';

// Kullanıcı tipi
interface LoggedInUser {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

// Ürün tipi
interface Product {
  id: string;
  code: string;
  productType: string;
  image?: string;
  pieceGram: number;
  filaments?: Array<{
    type: string;
    color: string;
    weight: number;
  }>;
}

// Pazaryeri siparişi tipi
interface PazaryeriSiparis {
  id?: string;
  orderCode?: string;
  pazaryeri: string;
  productId: string;
  productCode: string;
  productType: string;
  quantity: number;
  salePrice: number;
  orderDate: string;
  status: string;
  notes?: string;
}

// Pazaryeri seçenekleri
const PAZARYERLERI = [
  'Trendyol',
  'Hepsiburada', 
  'eBay',
  'Etsy',
  'Amazon',
  'Gittigidiyor',
  'Çiçeksepeti',
  'Diğer'
];

export default function PazaryeriSiparisleriPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [siparisler, setSiparisler] = useState<PazaryeriSiparis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    pazaryeri: 'Trendyol',
    productId: '',
    quantity: 1,
    salePrice: 0,
    customerName: '',
    customerSurname: '',
    notes: ''
  });

  // Arama ve filtreleme
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPazaryeri, setSelectedPazaryeri] = useState('Tümü');

  const router = useRouter();

  // Kullanıcı kontrolü
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as LoggedInUser;
        setCurrentUser(userData);
        
        // Sadece admin erişebilir
        if (userData.type !== 'admin') {
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Kullanıcı bilgisi yüklenirken hata:', error);
        router.push('/');
        return;
      }
    } else {
      router.push('/');
      return;
    }
  }, [router]);

  // Ürünleri yükle
  useEffect(() => {
    if (currentUser?.type === 'admin') {
      fetchProducts();
      fetchPazaryeriSiparisleri();
    }
  }, [currentUser]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Ürünler yüklenemedi');
      
      const data = await response.json();
      console.log('API\'dan gelen ürünler:', data);
      console.log('İlk ürün ID tipi:', typeof data[0]?.id);
      setProducts(data);
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
      toast.error('Ürünler yüklenirken bir hata oluştu!');
    }
  };

  const fetchPazaryeriSiparisleri = async () => {
    try {
      const response = await fetch('/api/orders?type=pazaryeri');
      if (!response.ok) throw new Error('Siparişler yüklenemedi');
      
      const data = await response.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setSiparisler(list);
    } catch (error) {
      console.error('Pazaryeri siparişleri yüklenirken hata:', error);
      // Hata durumunda boş array
      setSiparisler([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
    
    // ProductId değiştiğinde log'la
    if (name === 'productId') {
      console.log('Seçilen Product ID:', value, 'Tipi:', typeof value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.quantity || !formData.salePrice) {
      toast.warning('Lütfen tüm zorunlu alanları doldurun!');
      return;
    }

    setIsLoading(true);

    try {
      // Debug için log'lar
      console.log('Seçilen Product ID:', formData.productId);
      console.log('Mevcut Products:', products);
      console.log('Products uzunluk:', products.length);
      console.log('İlk ürünün tam bilgisi:', products[0]);
      
      const selectedProduct = products.find(p => {
        console.log('Karşılaştırma:', p.id, '===', formData.productId);
        console.log('Tip karşılaştırması:', typeof p.id, 'vs', typeof formData.productId);
        console.log('Eşit mi?', p.id === formData.productId);
        console.log('String karşılaştırma:', p.id.toString() === formData.productId.toString());
        return p.id.toString() === formData.productId.toString();
      });
      
      console.log('Bulunan ürün:', selectedProduct);
      
      if (!selectedProduct) {
        throw new Error(`Seçilen ürün bulunamadı. ID: ${formData.productId}, Toplam ürün: ${products.length}`);
      }

      const orderData = {
        customerId: null, // Pazaryeri siparişlerinde müşteri yok
        totalAmount: formData.salePrice * formData.quantity,
        status: 'Onay Bekliyor',
        paymentStatus: 'Ödendi', // Pazaryeri siparişleri genelde ödenmiş gelir
        notes: `Pazaryeri: ${formData.pazaryeri}${
          formData.customerName || formData.customerSurname 
            ? ` | Müşteri: ${formData.customerName} ${formData.customerSurname}`.trim()
            : ''
        }${formData.notes ? ` | ${formData.notes}` : ''}`,
        orderType: 'pazaryeri',
        pazaryeri: formData.pazaryeri,
        items: [{
          productId: formData.productId,
          quantity: formData.quantity,
          unitPrice: formData.salePrice
        }]
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sipariş oluşturulamadı: ${errorText}`);
      }

      const result = await response.json();
      
      toast.success(`Pazaryeri siparişi oluşturuldu! Sipariş No: ${result.orderCode} - Toplam: ${orderData.totalAmount}₺`);
      
      // Formu temizle
      setFormData({
        pazaryeri: 'Trendyol',
        productId: '',
        quantity: 1,
        salePrice: 0,
        customerName: '',
        customerSurname: '',
        notes: ''
      });

      // Siparişleri yenile
      fetchPazaryeriSiparisleri();

    } catch (error) {
      console.error('Sipariş oluşturulurken hata:', error);
      toast.error('Sipariş oluşturulurken bir hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  // Seçilen ürün bilgisi
  const selectedProduct = products.find(p => String(p.id) === String(formData.productId));

  // Filtrelenmiş siparişler
  const filteredSiparisler = siparisler.filter(siparis => {
    const searchMatch = siparis.productCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       siparis.orderCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const pazaryeriMatch = selectedPazaryeri === 'Tümü' || siparis.pazaryeri === selectedPazaryeri;
    
    return searchMatch && pazaryeriMatch;
  });

  if (currentUser?.type !== 'admin') {
    return <div>Yönlendiriliyor...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Sayfa Başlığı */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Pazaryeri Siparişleri</h1>
          <div className="text-sm text-gray-500">
            Admin Paneli
          </div>
        </div>

        {/* Sipariş Oluşturma Formu */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icons.PlusIcon className="w-5 h-5" />
            Yeni Pazaryeri Siparişi
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pazaryeri Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pazaryeri *
                </label>
                <select
                  name="pazaryeri"
                  value={formData.pazaryeri}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {PAZARYERLERI.map(pazaryeri => (
                    <option key={pazaryeri} value={pazaryeri}>{pazaryeri}</option>
                  ))}
                </select>
              </div>

              {/* Ürün Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün *
                </label>
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Ürün Seçin</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.productType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adet *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Satış Fiyatı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birim Satış Fiyatı (₺) *
                </label>
                <input
                  type="number"
                  name="salePrice"
                  value={formData.salePrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Müşteri Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Müşteri Adı
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Müşterinin adı"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Müşteri Soyadı
                </label>
                <input
                  type="text"
                  name="customerSurname"
                  value={formData.customerSurname}
                  onChange={handleInputChange}
                  placeholder="Müşterinin soyadı"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Seçilen Ürün Bilgisi */}
            {selectedProduct && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Seçilen Ürün Bilgileri:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Kod:</span> {selectedProduct.code}
                  </div>
                  <div>
                    <span className="text-blue-700">Tip:</span> {selectedProduct.productType}
                  </div>
                  <div>
                    <span className="text-blue-700">Gramaj:</span> {selectedProduct.pieceGram}g/adet
                  </div>
                  <div>
                    <span className="text-blue-700">Toplam Tutar:</span> {(formData.salePrice * formData.quantity).toFixed(2)}₺
                  </div>
                </div>
              </div>
            )}

            {/* Not Alanı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Not (İsteğe Bağlı)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sipariş hakkında ek bilgiler..."
              />
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-md transition-colors flex items-center gap-2"
              >
                <Icons.ShoppingCartIcon className="w-5 h-5" />
                {isLoading ? 'Oluşturuluyor...' : 'Sipariş Oluştur'}
              </button>
            </div>
          </form>
        </div>

        {/* Pazaryeri Siparişleri Listesi */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pazaryeri Siparişleri</h2>
              <div className="text-sm text-gray-500">
                Toplam: {filteredSiparisler.length} sipariş
              </div>
            </div>

            {/* Arama ve Filtreleme */}
            <div className="flex gap-4">
              <div className="search-container flex-1">
                <Icons.SearchIcon className="search-icon" />
                <input
                  type="text"
                  placeholder="Sipariş kodu veya ürün kodu ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedPazaryeri}
                onChange={(e) => setSelectedPazaryeri(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Tümü">Tüm Pazaryerleri</option>
                {PAZARYERLERI.map(pazaryeri => (
                  <option key={pazaryeri} value={pazaryeri}>{pazaryeri}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tablo */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sipariş No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pazaryeri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Birim Fiyat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSiparisler.length > 0 ? (
                  filteredSiparisler.map((siparis) => (
                    <tr key={siparis.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {siparis.orderCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {siparis.pazaryeri}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{siparis.productCode}</div>
                          <div className="text-gray-500">{siparis.productType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {siparis.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {siparis.salePrice}₺
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {(siparis.salePrice * siparis.quantity).toFixed(2)}₺
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          siparis.status === 'Hazırlandı' ? 'bg-green-100 text-green-800' :
                          siparis.status === 'Üretimde' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {siparis.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {siparis.orderDate}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Icons.PackageIcon className="w-12 h-12 text-gray-300 mb-2" />
                        <div>Henüz pazaryeri siparişi bulunmuyor</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
} 