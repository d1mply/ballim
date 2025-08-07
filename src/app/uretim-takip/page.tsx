'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';

// WebSocket port tanımı (şimdilik kullanılmıyor)

// Sipariş durumları
type OrderStatus = 'onay_bekliyor' | 'uretiliyor' | 'uretildi' | 'hazirlaniyor' | 'hazirlandi';

// Sipariş öğesi tipi
interface OrderItem {
  id: string;
  order_code: string;
  customer_name: string;
  order_date: string;
  status: OrderStatus;
  products: {
    id: string;
    product_id: string;
    product_code: string;
    product_type: string;
    quantity: number;
    capacity: number;
    stock_quantity: number;
  }[];
  production_quantity?: number;
  skip_production?: boolean;
}

// LoggedInUser tipi
interface LoggedInUser {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

// Durum çevirisi için yardımcı fonksiyon
const convertStatus = (status: string): OrderStatus => {
  const statusMap: { [key: string]: OrderStatus } = {
    'Onay Bekliyor': 'onay_bekliyor',
    'Üretimde': 'uretiliyor',
    'Üretildi': 'uretildi',
    'Hazırlanıyor': 'hazirlaniyor',
    'Hazırlandı': 'hazirlandi'
  };
  return statusMap[status] || 'onay_bekliyor';
};

// API için durum çevirisi
const convertStatusForApi = (status: OrderStatus): string => {
  const statusMap: { [key in OrderStatus]: string } = {
    'onay_bekliyor': 'Onay Bekliyor',
    'uretiliyor': 'Üretimde',
    'uretildi': 'Üretildi',
    'hazirlaniyor': 'Hazırlanıyor',
    'hazirlandi': 'Hazırlandı'
  };
  return statusMap[status];
};

// Durum bilgilerini getiren yardımcı fonksiyon
const getStatusInfo = (status: OrderStatus) => {
  switch(status) {
    case 'onay_bekliyor':
      return { color: 'text-yellow-500', bg: 'bg-yellow-100', text: 'Onay Bekliyor' };
    case 'uretiliyor':
      return { color: 'text-blue-500', bg: 'bg-blue-100', text: 'Üretiliyor' };
    case 'uretildi':
      return { color: 'text-green-500', bg: 'bg-green-100', text: 'Üretildi' };
    case 'hazirlaniyor':
      return { color: 'text-purple-500', bg: 'bg-purple-100', text: 'Hazırlanıyor' };
    case 'hazirlandi':
      return { color: 'text-teal-500', bg: 'bg-teal-100', text: 'Hazırlandı' };
    default:
      return { color: 'text-gray-500', bg: 'bg-gray-100', text: 'Bilinmiyor' };
  }
};

// Sipariş kartı bileşeni
const OrderCard = ({ item, onStartProduction, onStatusChange }: {
  item: OrderItem;
  onStartProduction: (item: OrderItem) => void;
  onStatusChange: (itemId: string, newStatus: OrderStatus) => void;
}) => {
  const { color, bg, text } = getStatusInfo(item.status);
  const product = item.products[0] || null;

  if (!product) return null;

  return (
    <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-4">
        {/* Başlık ve Durum */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              {product.product_code} - {product.product_type}
            </h3>
            <div className="text-sm text-gray-600 mt-1">
              <span>Sipariş No: {item.order_code}</span>
              <span className="mx-2">•</span>
              <span>{item.customer_name}</span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${color} ${bg}`}>
            {text}
          </div>
        </div>

        {/* Detay Bilgileri */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Sipariş Miktarı</div>
            <div className="text-lg font-semibold mt-1">{product.quantity} adet</div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Stok Durumu</div>
            <div className="text-lg font-semibold mt-1">
              {product.stock_quantity} adet
              {product.stock_quantity === 0 && (
                <span className="text-red-500 text-sm block">Stokta Yok</span>
              )}
              {product.stock_quantity > 0 && product.stock_quantity < product.quantity && (
                <span className="text-orange-500 text-sm block">Yetersiz</span>
              )}
              {product.stock_quantity >= product.quantity && (
                <span className="text-green-500 text-sm block">Yeterli</span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Kapasite</div>
            <div className="text-lg font-semibold mt-1">{product.capacity} adet/tabla</div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Sipariş Tarihi</div>
            <div className="text-lg font-semibold mt-1">{item.order_date}</div>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          {item.status === 'onay_bekliyor' && (
            <button 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              onClick={() => onStartProduction(item)}
            >
              <Icons.PlayIcon className="w-5 h-5 mr-2" /> 
              Üretime Al
            </button>
          )}
          
          {item.status === 'uretiliyor' && (
            <button 
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
              onClick={() => onStatusChange(item.id, 'uretildi')}
            >
              <Icons.CheckIcon className="w-5 h-5 mr-2" /> 
              Üretimi Tamamla
            </button>
          )}
          
          {item.status === 'uretildi' && (
            <button 
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200"
              onClick={() => onStatusChange(item.id, 'hazirlaniyor')}
            >
              <Icons.PackageIcon className="w-5 h-5 mr-2" /> 
              Hazırlamaya Başla
            </button>
          )}
          
          {item.status === 'hazirlaniyor' && (
            <button 
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors duration-200"
              onClick={() => onStatusChange(item.id, 'hazirlandi')}
            >
              <Icons.TruckIcon className="w-5 h-5 mr-2" /> 
              Hazırlandı
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function UretimTakipPage() {
  const router = useRouter();
  const [user, setUser] = useState<LoggedInUser | null>(null);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'tumu'>('tumu');
  const [dateFilter, setDateFilter] = useState(''); // Tarih filtresi
  const [customerFilter, setCustomerFilter] = useState(''); // Müşteri filtresi
  const [loading, setLoading] = useState(true);
  // Seçili öğeler (gelecekte kullanılacak)
  const [productionModal, setProductionModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);
  const [productionQuantity, setProductionQuantity] = useState<number>(0);
  const [productionType, setProductionType] = useState<'tabla' | 'adet'>('tabla');
  const [tableCount, setTableCount] = useState<number>(1);
  const [skipProduction, setSkipProduction] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isPollingActive, setIsPollingActive] = useState(true);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);



  // Kullanıcı kontrolü ve sayfa yetkisi
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as LoggedInUser;
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
      // Kullanıcı girişi yapılmamışsa ana sayfaya yönlendir
      router.push('/');
    }
  }, [router]);



  // Siparişleri API'den çek - useCallback ile optimize et
  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔍 API\'den gelen ham veriler:', data);
      console.log('🔍 İlk sipariş örneği:', data[0]);
      
      const formattedOrders: OrderItem[] = data.map((order: { id: string; orderCode: string; customerName: string; orderDate: string; status: string; products: { id?: string; code: string; name: string; quantity: number; capacity?: number; stock_quantity?: number }[]; production_quantity?: number; skip_production?: boolean }) => {
        console.log('🔄 Formatlanıyor:', {
          id: order.id,
          order_code: order.orderCode,
          customerName: order.customerName
        });
        
        const formattedOrder = {
          id: order.id,
          order_code: order.orderCode || order.id,
          customer_name: order.customerName || 'Pazaryeri Müşterisi',
          order_date: order.orderDate,
          status: convertStatus(order.status),
          products: order.products.map((product: { id?: string; code: string; name: string; quantity: number; capacity?: number; stock_quantity?: number }) => ({
            id: product.id || '',
            product_id: product.code,
            product_code: product.code,
            product_type: product.name,
            quantity: product.quantity,
            capacity: product.capacity || 0,
            stock_quantity: product.stock_quantity || 0
          })),
          production_quantity: order.production_quantity || 0,
          skip_production: order.skip_production || false
        };
        console.log('✅ Formatlanmış sipariş:', formattedOrder);
        return formattedOrder;
      });
      
      setOrders(formattedOrders);
      setFilteredOrders(formattedOrders);
      setLastUpdate(new Date());
      setConsecutiveErrors(0);
      if (loading) setLoading(false);
    } catch (error) {
      setConsecutiveErrors(prev => prev + 1);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Siparişler yüklenirken hata:', error);
      }
      
      if (loading) setLoading(false);
      
      if (orders.length === 0) {
        console.warn('API bağlantı sorunu. Sayfa yenilenirse veriler yüklenebilir.');
      }

      if (consecutiveErrors >= 2) {
        setIsPollingActive(false);
        console.warn('Sürekli API hatası nedeniyle otomatik güncelleme durduruldu. Manuel yenile butonunu kullanın.');
      }
    }
  }, []); // useCallback dependencies

  // İlk yükleme
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Otomatik güncelleme (her 2 dakikada bir ve sadece aktifse)
  useEffect(() => {
    if (!isPollingActive) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 120000); // 2 dakika (120 saniye)

    return () => clearInterval(interval);
  }, [isPollingActive, consecutiveErrors, fetchOrders]);

  // Manuel yenile fonksiyonu
  const handleManualRefresh = async () => {
    setIsPollingActive(true); // Polling'i yeniden aktif et
    setConsecutiveErrors(0); // Hata sayacını sıfırla
    await fetchOrders();
  };

  // Filtreleme fonksiyonu
  useEffect(() => {
    let filtered = [...orders];
    
    // Durum filtresi
    if (statusFilter !== 'tumu') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // Tarih filtresi
    if (dateFilter) {
      filtered = filtered.filter(item => {
        const orderDate = new Date(item.order_date).toISOString().split('T')[0];
        return orderDate === dateFilter;
      });
    }
    
    // Müşteri filtresi
    if (customerFilter) {
      filtered = filtered.filter(item => 
        item.customer_name.toLowerCase().includes(customerFilter.toLowerCase()) ||
        item.id.toString().toLowerCase().includes(customerFilter.toLowerCase()) ||
        item.order_code.toString().toLowerCase().includes(customerFilter.toLowerCase())
      );
    }
    
    setFilteredOrders(filtered);
  }, [statusFilter, dateFilter, customerFilter, orders]);

  // Durum değiştirme fonksiyonu
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Sipariş bulunamadı');
      }

      // skipProduction değerini sipariş bilgisinden al
      const orderSkipProduction = order.skip_production || false;

      const requestData = {
        orderId: order.order_code,
        status: convertStatusForApi(newStatus as OrderStatus),
        productionQuantity: order.production_quantity || 0,
        skipProduction: orderSkipProduction
      };

      console.log('📤 Gönderilen veri:', requestData);

      const response = await fetch('/api/orders/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();
      console.log('API yanıtı:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Durum güncellenemedi');
      }

      // Siparişleri yenile
      await fetchOrders();
    } catch (error) {
      console.error('Durum değiştirme hatası:', error);
      alert('Durum değiştirilirken bir hata oluştu!');
    }
  };

  // Üretime alma fonksiyonu
  const handleStartProduction = (item: OrderItem) => {
    setSelectedOrderItem(item);
    
    // Varsayılan değerleri ayarla
    const defaultCapacity = item.products[0]?.capacity || 0;
    const defaultQuantity = item.products[0]?.quantity || 0;
    
    if (defaultCapacity > 0) {
      setTableCount(1);
      setProductionType('tabla');
      setProductionQuantity(defaultCapacity);
    } else {
      setProductionType('adet');
      setProductionQuantity(defaultQuantity);
    }
    
    setProductionModal(true);
  };

  // Üretim miktarı hesaplama
  useEffect(() => {
    if (!selectedOrderItem) return;

    if (productionType === 'tabla') {
      setProductionQuantity(selectedOrderItem.products[0]?.capacity * tableCount || 0);
    }
  }, [productionType, tableCount, selectedOrderItem]);

  // Üretim onaylama
  const confirmProduction = async () => {
    console.log('🚀 confirmProduction fonksiyonu başladı');
    
    if (!selectedOrderItem) {
      console.error('❌ selectedOrderItem bulunamadı');
      return;
    }

    console.log('🔍 selectedOrderItem TAM içeriği:', JSON.stringify(selectedOrderItem, null, 2));

    // Gerekli alanları kontrol et
    const orderCode = selectedOrderItem.order_code || selectedOrderItem.id;
    if (!orderCode) {
      console.error('❌ Sipariş kodu veya ID bulunamadı. order_code:', selectedOrderItem.order_code, 'id:', selectedOrderItem.id);
      console.error('❌ Mevcut alanlar:', Object.keys(selectedOrderItem));
      alert('Sipariş kodu bulunamadı!');
      return;
    }

    const requestData = {
      orderId: selectedOrderItem.order_code,
      status: 'Üretimde',
      productionQuantity: skipProduction ? 0 : productionQuantity,
      productionType: productionType, // 'tabla' veya 'adet'
      skipProduction
    };

    console.log('📋 FRONTEND: Gönderilecek veri TAM format:', JSON.stringify(requestData, null, 2));
    console.log('📋 FRONTEND: Parametreler:', {
      orderId: { value: requestData.orderId, type: typeof requestData.orderId },
      status: { value: requestData.status, type: typeof requestData.status },
      productionQuantity: { value: requestData.productionQuantity, type: typeof requestData.productionQuantity },
      skipProduction: { value: requestData.skipProduction, type: typeof requestData.skipProduction }
    });

    try {
      console.log('🌐 API çağrısı yapılıyor...');
      
      const response = await fetch('/api/orders/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();
      console.log('📥 API yanıtı:', responseData);

      if (!response.ok) {
        console.error('❌ API Hatası:', {
          status: response.status,
          statusText: response.statusText,
          responseData
        });
        throw new Error(responseData.error || 'Üretim başlatılamadı');
      }

      console.log('✅ API başarılı, siparişler yenileniyor...');
      await fetchOrders();

      console.log('🔒 Modal kapatılıyor...');
      setProductionModal(false);
      setSelectedOrderItem(null);
      setProductionQuantity(0);
      setTableCount(1);
      setSkipProduction(false);
    } catch (error) {
      console.error('❌ Üretim başlatma hatası:', error);
      if (error instanceof Error) {
        console.error('❌ Hata detayı:', error.message);
        console.error('❌ Hata stack:', error.stack);
      }
      alert('Üretim başlatılırken bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    }
  };

  // Stok durumuna göre renk (şimdilik kullanılmıyor)
  // const getStockClass = (item: OrderItem) => {
  //   if (item.products[0]?.stock_quantity === 0) {
  //     return 'bg-red-100 border-red-300';
  //   } else if (item.products[0]?.stock_quantity < item.products[0]?.quantity) {
  //     return 'bg-orange-100 border-orange-300';
  //   } else {
  //     return 'bg-green-100 border-green-300';
  //   }
  // };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }
  

  
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

  return (
    <Layout>
      <div className="space-y-6 w-full">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Üretim Takip</h1>
            <div className="text-sm text-gray-500">
              Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
            </div>
            {/* Polling durumu */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isPollingActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isPollingActive ? 'Otomatik güncelleme aktif' : 'Manuel güncelleme'}
              </span>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Icons.RefreshIcon className="w-4 h-4 mr-1" />
            Yenile
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-border rounded-md py-1 px-3 text-sm"
            />
            <input
              type="text"
              placeholder="Müşteri ara..."
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="border border-border rounded-md py-1 px-3 text-sm"
            />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'tumu')}
              className="border border-border rounded-md py-1 px-3 text-sm"
            >
              <option value="tumu">Tüm Durumlar</option>
              <option value="onay_bekliyor">Onay Bekliyor</option>
              <option value="uretiliyor">Üretiliyor</option>
              <option value="uretildi">Üretildi</option>
              <option value="hazirlaniyor">Hazırlanıyor</option>
              <option value="hazirlandi">Hazırlandı</option>
            </select>
            <button className="btn-secondary" onClick={() => {
              setDateFilter('');
              setCustomerFilter('');
              setStatusFilter('tumu');
            }}>
              <Icons.RefreshIcon className="w-4 h-4 mr-1" /> Filtreleri Temizle
            </button>
          </div>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <Icons.PackageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Gösterilecek sipariş yok</h3>
            <p className="text-gray-600">
              Seçilen filtrelere uygun sipariş bulunamadı.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredOrders.map(item => (
              <OrderCard
                key={item.id}
                item={item}
                onStartProduction={handleStartProduction}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Üretim Modalı */}
      {productionModal && selectedOrderItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Üretime Al</h3>
            <p className="mb-4">
              <span className="font-medium">{selectedOrderItem.products[0]?.product_code}</span> - {selectedOrderItem.products[0]?.product_type}
            </p>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">
                Sipariş miktarı: {selectedOrderItem.products[0]?.quantity || 0} adet
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Mevcut stok: {selectedOrderItem.products[0]?.stock_quantity || 0} adet
              </p>
              
              {/* Yeterli stok bilgisi */}
              {selectedOrderItem.products[0]?.stock_quantity >= selectedOrderItem.products[0]?.quantity && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                  <p className="text-green-700 font-medium">Yeterli stok mevcut</p>
                  <p className="text-green-600 text-sm mt-1">
                    Bu sipariş için yeterli stok mevcut. İsterseniz ek üretim yapabilir veya mevcut stoktan kullanabilirsiniz.
                  </p>
                </div>
              )}
              
              {/* Üretim seçenekleri - her durumda göster */}
              <div className="flex flex-col mb-4">
                <label className="text-sm font-medium mb-1">Üretim Tipi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`py-2 px-3 border rounded-md ${productionType === 'tabla' ? 'bg-primary text-white' : 'bg-secondary'}`}
                    onClick={() => setProductionType('tabla')}
                  >
                    Tabla
                  </button>
                  <button
                    className={`py-2 px-3 border rounded-md ${productionType === 'adet' ? 'bg-primary text-white' : 'bg-secondary'}`}
                    onClick={() => setProductionType('adet')}
                  >
                    Adet
                  </button>
                </div>
              </div>
              
              {/* Üretim miktarı seçimi - her durumda göster */}
              {productionType === 'tabla' ? (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-1">Tabla Sayısı</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      value={tableCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setTableCount(value);
                        const capacity = selectedOrderItem.products[0]?.capacity || 0;
                        setProductionQuantity(value * capacity);
                      }}
                      className="w-full border border-border rounded-md py-2 px-3"
                    />
                  </div>
                  <p className="mt-2 text-sm">
                    Üretilecek miktar: <span className="font-medium">{productionQuantity} adet</span>
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-1">Üretim Miktarı</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      value={productionQuantity}
                      onChange={(e) => setProductionQuantity(parseInt(e.target.value) || 0)}
                      className="w-full border border-border rounded-md py-2 px-3"
                    />
                  </div>
                </div>
              )}

              {/* Üretim yapılıp yapılmayacağı seçimi */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-1">Üretim Tercihi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`py-2 px-3 border rounded-md ${!skipProduction ? 'bg-primary text-white' : 'bg-secondary'}`}
                    onClick={() => setSkipProduction(false)}
                  >
                    Üretim Yap
                  </button>
                  <button
                    className={`py-2 px-3 border rounded-md ${skipProduction ? 'bg-primary text-white' : 'bg-secondary'}`}
                    onClick={() => setSkipProduction(true)}
                  >
                    Stoktan Kullan
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                className="btn-outline" 
                onClick={() => {
                  setProductionModal(false);
                  setSelectedOrderItem(null);
                  setProductionQuantity(0);
                  setTableCount(1);
                  setSkipProduction(false);
                }}
              >
                İptal
              </button>
              <button 
                className="btn-primary"
                onClick={confirmProduction}
                disabled={!skipProduction && productionQuantity <= 0}
              >
                {skipProduction ? 'Stoktan Kullan' : 'Üretimi Başlat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 