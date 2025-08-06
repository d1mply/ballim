'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import ShippingLabel from '../../components/ShippingLabel';

// Sipariş tipi tanımla
interface Order {
  id: string;
  customerName: string;
  orderDate: string;
  products: {
    id?: string;
    code: string;
    name: string;
    quantity: number;
    image?: string;
  }[];
  totalAmount: number;
  status: string;
}

export default function SiparisTakipPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isShippingLabelOpen, setIsShippingLabelOpen] = useState(false);
  const [shippingLabelData, setShippingLabelData] = useState<{ order: Order; customer: { name: string; address: string; phone: string } } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ type: string } | null>(null);
  
  // Kullanıcı bilgisini yükle - Layout ile aynı sistem
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      const user = JSON.parse(loggedUserJson);
      setCurrentUser(user);
    }
  }, []);

  // API'den sipariş verileri yükle
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Müşteri tipine göre API URL'ini oluştur
        let apiUrl = '/api/orders';
        
        if (currentUser?.type === 'customer') {
          // Müşteri ise sadece kendi siparişlerini getir
          const customerId = currentUser.id;
          apiUrl = `/api/orders?customerId=${customerId}`;
          console.log('🔒 Müşteri izolasyonu: Sadece kendi siparişleri getiriliyor:', customerId);
        } else {
          console.log('👑 Admin: Tüm siparişler getiriliyor');
        }
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          console.error('API Yanıt Detayları:', {
            status: response.status,
            statusText: response.statusText
          });
          const errorData = await response.text();
          console.error('API Hata Detayı:', errorData);
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API Yanıtı:', data); // Debug için
        
        // Veri kontrolü ve dönüşümü
        if (Array.isArray(data)) {
          const formattedOrders = data.map(order => ({
            id: order.id || '',
            customerName: order.customerName || '',
            orderDate: order.orderDate || '',
            products: Array.isArray(order.products) ? order.products : [],
            totalAmount: typeof order.totalAmount === 'number' ? order.totalAmount : 0,
            status: order.status || 'Belirsiz'
          }));
          setOrders(formattedOrders);
        } else {
          console.warn('API yanıtı dizi formatında değil:', data);
          setOrders([]);
        }
      } catch (error) {
        console.error('Siparişleri getirme hatası:', error);
        setOrders([]);
      }
    };
    
    fetchOrders();
  }, [currentUser]); // currentUser değiştiğinde yeniden fetch et
  
  // Arama ve filtreleme
  const filteredOrders = orders.filter(order => {
    const searchMatch = 
      order.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusMatch = statusFilter === '' || order.status === statusFilter;
    
    return searchMatch && statusMatch;
  });
  
  // Sipariş durumu renklerini belirle
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Onay Bekliyor':
        return 'bg-warning/10 text-warning';
      case 'Üretimde':
        return 'bg-primary/10 text-primary';
      case 'Üretildi':
        return 'bg-accent/10 text-accent';
      case 'Hazırlanıyor':
        return 'bg-muted text-muted-foreground';
      case 'Hazırlandı':
        return 'bg-success/10 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  
    // Sipariş detaylarını göster
  const handleShowDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };
  
  // Sipariş sil
  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Bu siparişi silmek istediğinizden emin misiniz?')) {
      try {
        // Siparişi API'den sil
        const response = await fetch(`/api/orders?id=${orderId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        // State'i güncelle
        const updatedOrders = orders.filter(order => order.id !== orderId);
        setOrders(updatedOrders);
        
        if (selectedOrder && selectedOrder.id === orderId) {
          setIsDetailOpen(false);
        }
      } catch (error) {
        console.error('Sipariş silinirken hata:', error);
        alert('Sipariş silinirken bir hata oluştu!');
      }
    }
  };

  // Sevkiyat belgesi yazdır (sadece admin)
  const handlePrintShippingLabel = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`);
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setShippingLabelData(data);
      setIsShippingLabelOpen(true);
    } catch (error) {
      console.error('Sevkiyat belgesi verileri alınırken hata:', error);
      alert('Sevkiyat belgesi oluşturulurken bir hata oluştu!');
    }
  };
  
  return (
    <Layout>
      <div className="space-y-5 w-full">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Sipariş Takip</h1>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="search-container flex-grow">
              <Icons.SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Sipariş veya müşteri ara..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Durum:</label>
              <select 
                className="min-w-[140px] px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tüm Durumlar</option>
                <option value="Onay Bekliyor">Onay Bekliyor</option>
                <option value="Üretimde">Üretimde</option>
                <option value="Üretildi">Üretildi</option>
                <option value="Hazırlanıyor">Hazırlanıyor</option>
                <option value="Hazırlandı">Hazırlandı</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sipariş No</th>
                <th>Müşteri</th>
                <th>Tarih</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th className="text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium">{order.id}</td>
                    <td>{order.customerName}</td>
                    <td>{order.orderDate}</td>
                    <td>{order.totalAmount}₺</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleShowDetails(order)}
                          className="action-btn action-btn-view"
                          title="Detaylar"
                        >
                          Detaylar
                        </button>
                        {/* Yazdır butonu sadece admin için */}
                        {currentUser?.type === 'admin' && (
                          <button 
                            onClick={() => handlePrintShippingLabel(order.id)}
                            className="action-btn action-btn-primary"
                            title="Sevkiyat Belgesi Yazdır"
                          >
                            <Icons.PrinterIcon />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
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
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Sipariş bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Sipariş Detay Modalı */}
      {selectedOrder && isDetailOpen && (
        <div className="modal">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Sipariş Detayı - {selectedOrder.id}</h2>
              <button onClick={() => setIsDetailOpen(false)} className="text-muted-foreground hover:text-foreground">
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Sipariş Bilgileri</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Müşteri:</span>
                      <span>{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tarih:</span>
                      <span>{selectedOrder.orderDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Toplam Tutar:</span>
                      <span>{selectedOrder.totalAmount}₺</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Durum Bilgisi</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sipariş Durumu:</span>
                      <span className={`status-badge ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Sipariş Ürünleri</h3>
                <div className="overflow-hidden border border-border rounded-md">
                  <table className="w-full">
                    <thead className="bg-muted text-left">
                      <tr>
                        <th className="py-2 px-4 font-medium">Ürün Kodu</th>
                        <th className="py-2 px-4 font-medium">Ürün Adı</th>
                        <th className="py-2 px-4 font-medium">Adet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.products && selectedOrder.products.length > 0 ? (
                        selectedOrder.products.map((product, index) => (
                          <tr key={index} className="border-t border-border">
                            <td className="py-2 px-4">{product.code}</td>
                            <td className="py-2 px-4">{product.name}</td>
                            <td className="py-2 px-4">{product.quantity}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-muted-foreground">
                            Ürün bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
                            <div className="modal-footer mt-6">
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

      {/* Sevkiyat Belgesi Modalı */}
      {isShippingLabelOpen && shippingLabelData && (
        <ShippingLabel
          orderData={shippingLabelData}
          onClose={() => {
            setIsShippingLabelOpen(false);
            setShippingLabelData(null);
          }}
        />
      )}
    </Layout>
  );
} 