'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import ShippingLabel from '../../components/ShippingLabel';
import { useToast } from '../../contexts/ToastContext';

// Sipariş tipi tanımla - Basitleştirilmiş
interface Order {
  id: string;
  orderCode: string;
  customerName: string;
  orderDate: string;
  products: {
    id?: string;
    code: string;
    name: string;
    quantity: number;
    status: string;
  }[];
  totalAmount: number;
  status: string;
}

// Kullanıcı tipi
interface User {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

export default function SiparisTakipPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isShippingLabelOpen, setIsShippingLabelOpen] = useState(false);
  const [shippingLabelData, setShippingLabelData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  
  // Kullanıcı kontrolü
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as User;
        setUser(userData);
      } catch (error) {
        console.error('Kullanıcı bilgisi yüklenirken hata:', error);
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  // API'den sipariş verileri yükle - Basitleştirilmiş
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!user) {
          setOrders([]);
          return;
        }

        // Müşteri tipine göre API URL'ini oluştur
        let apiUrl = '/api/orders';
        
        if (user.type === 'customer') {
          apiUrl = `/api/orders?customerId=${user.id}`;
        }
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Veri kontrolü ve dönüşümü (dizi veya {data, meta})
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        if (Array.isArray(list)) {
          const formattedOrders = list.map((order: any) => ({
            id: order.id || '',
            orderCode: order.order_code || order.id || '',
            customerName: order.customer_name || order.customerName || '',
            orderDate: order.order_date || order.orderDate || '',
            products: Array.isArray(order.products) ? order.products : [],
            totalAmount: typeof order.total_amount === 'number' ? order.total_amount : (typeof order.totalAmount === 'number' ? order.totalAmount : 0),
            status: order.status || 'Belirsiz'
          }));
          setOrders(formattedOrders);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error('Siparişleri getirme hatası:', error);
        setError('Siparişler yüklenirken bir hata oluştu');
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchOrders();
    }
  }, [user]);
  
  // Arama ve filtreleme - Basitleştirilmiş
  const filteredOrders = orders.filter(order => {
    const searchMatch = 
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  
  // Sipariş durumu güncelle - Basitleştirilmiş
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch('/api/orders/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          status: newStatus,
          productionQuantity: 0,
          skipProduction: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details?.join(', ') || errorData.error || 'Durum güncellenemedi';
        throw new Error(errorMessage);
      }

      // Siparişleri yenile
      const apiUrl = user?.type === 'customer' ? `/api/orders?customerId=${user.id}` : '/api/orders';
      const ordersResponse = await fetch(apiUrl);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const list = Array.isArray(ordersData) ? ordersData : (Array.isArray(ordersData?.data) ? ordersData.data : []);
        const formattedOrders = list.map((order: any) => ({
          id: order.id || '',
          orderCode: order.order_code || order.id || '',
          customerName: order.customer_name || order.customerName || '',
          orderDate: order.order_date || order.orderDate || '',
          products: Array.isArray(order.products) ? order.products : [],
          totalAmount: typeof order.total_amount === 'number' ? order.total_amount : (typeof order.totalAmount === 'number' ? order.totalAmount : 0),
          status: order.status || 'Belirsiz'
        }));
        setOrders(formattedOrders);
      }

      toast.success('Sipariş durumu güncellendi');
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      toast.error(error instanceof Error ? error.message : 'Durum güncellenirken bir hata oluştu');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Sipariş sil
  const handleDeleteOrder = async (orderId: string) => {
    // Siparişin durumunu kontrol et
    const order = orders.find(o => o.id === orderId);
    const isHazirlandi = order?.status === 'Hazırlandı' || order?.status === 'hazirlandi';
    
    const confirmMessage = isHazirlandi 
      ? 'Bu sipariş "Hazırlandı" durumunda. İptal edilirse üretilen ürünler stoka eklenecek. Emin misiniz?'
      : 'Bu siparişi silmek istediğinizden emin misiniz?';
    
    if (window.confirm(confirmMessage)) {
      setDeletingOrderId(orderId);
      try {
        // Siparişi API'den sil
        const response = await fetch(`/api/orders?id=${orderId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.details?.join(', ') || errorData.error || 'Sipariş silinemedi';
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        // State'i güncelle
        const updatedOrders = orders.filter(order => order.id !== orderId);
        setOrders(updatedOrders);
        
        if (selectedOrder && selectedOrder.id === orderId) {
          setIsDetailOpen(false);
        }
        
        // Başarı mesajını göster
        toast.success(result.message || 'Sipariş başarıyla silindi');
      } catch (error) {
        console.error('Sipariş silinirken hata:', error);
        toast.error(error instanceof Error ? error.message : 'Sipariş silinirken bir hata oluştu');
      } finally {
        setDeletingOrderId(null);
      }
    }
  };

  // Sevkiyat belgesi yazdır (sadece admin)
  const handlePrintShippingLabel = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Sevkiyat belgesi oluşturulamadı';
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setShippingLabelData(data);
      setIsShippingLabelOpen(true);
    } catch (error) {
      console.error('Sevkiyat belgesi verileri alınırken hata:', error);
      toast.error(error instanceof Error ? error.message : 'Sevkiyat belgesi oluşturulamadı');
    }
  };
  
  // Giriş yapılmamışsa uyarı göster
  if (!user) {
    return (
      <Layout>
        <div className="space-y-5 w-full">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Sipariş Takip</h1>
          </div>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <Icons.UserIcon className="w-16 h-16 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-destructive mb-2">Erişim Reddedildi</h2>
            <p className="text-muted-foreground mb-4">
              Sipariş bilgilerinizi görüntülemek için giriş yapmanız gerekiyor.
            </p>
            <p className="text-sm text-muted-foreground">
              Lütfen admin tarafından verilen kullanıcı adı ve şifre ile giriş yapın.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Siparişler yükleniyor...</p>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">Hata</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Tekrar Dene
          </button>
        </div>
      </Layout>
    );
  }

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
                    <td className="font-medium">{order.orderCode}</td>
                    <td>{order.customerName}</td>
                    <td>{order.orderDate}</td>
                    <td>{order.totalAmount}₺</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`status-badge ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        {user?.type === 'admin' && (
                          updatingOrderId === order.id ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2"></div>
                          ) : (
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              disabled={updatingOrderId !== null}
                            >
                              <option value="Onay Bekliyor">Onay Bekliyor</option>
                              <option value="Üretimde">Üretimde</option>
                              <option value="Üretildi">Üretildi</option>
                              <option value="Hazırlanıyor">Hazırlanıyor</option>
                              <option value="Hazırlandı">Hazırlandı</option>
                            </select>
                          )
                        )}
                      </div>
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
                        {user?.type === 'admin' && (
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
                          disabled={deletingOrderId === order.id}
                        >
                          {deletingOrderId === order.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Icons.TrashIcon />
                          )}
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
              <h2 className="text-lg font-semibold">Sipariş Detayı - {selectedOrder.orderCode}</h2>
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