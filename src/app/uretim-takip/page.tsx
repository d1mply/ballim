'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { ProductionModal } from '@/components/production/ProductionModal';
import { OrderCard } from '@/components/production/OrderCard';
import { OrderItem, OrderProduct, User, ProductionFormData } from '@/types';
import { ORDER_STATUSES } from '@/constants';
import { apiGet, apiPut } from '@/utils/api';
import { convertStatus } from '@/utils/helpers';
import { useToast } from '@/contexts/ToastContext';

export default function UretimTakipPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('tumu');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state'leri
  const [productionModal, setProductionModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<OrderProduct | null>(null);

  // Kullanıcı kontrolü
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

  // Siparişleri yükle
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await apiGet<any>('/api/orders/production');
      
      if (response.success && response.data) {
        const raw = response.data;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        const formattedOrders = list.map((order: any) => ({
          id: order.id,
          orderCode: order.order_code || order.id,
          customerName: order.customer_name || 'Pazaryeri Müşterisi',
          orderDate: order.order_date,
          status: convertStatus(order.status),
          notes: order.notes || '',
          products: Array.isArray(order.products) ? order.products.map((p: any) => ({
            id: p.id,
            productId: p.product_id,
            productCode: p.product_code || 'N/A',
            productType: p.product_name || 'Ürün',
            quantity: p.quantity || 0,
            status: p.status || 'onay_bekliyor',
            capacity: p.capacity || 0,
            availableStock: p.availableStock || 0,
            reservedStock: p.reservedStock || 0,
            filaments: Array.isArray(p.filaments) ? p.filaments : []
          })) : []
        }));
      
      setOrders(formattedOrders);
      setFilteredOrders(formattedOrders);
      } else {
        setError(response.error || 'Siparişler yüklenemedi');
      }
    } catch (error) {
      console.error('Siparişleri yükleme hatası:', error);
      setError('Siparişler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
      }
  };

  // Siparişleri yükle
  useEffect(() => {
    if (user?.type === 'admin') {
      fetchOrders();
    }
  }, [user]);

  // Filtreleme
  useEffect(() => {
    if (statusFilter === 'tumu') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  }, [orders, statusFilter]);

  // Ürün durumu değiştir (modal aç)
  const handleProductStatusChange = async (order: OrderItem, product: OrderProduct) => {
    setSelectedOrderItem(order);
    setSelectedProduct(product);
    setProductionModal(true);
  };

  // Üretimi tamamla (direkt status değiştir)
  const handleCompleteProduction = async (order: OrderItem, product: OrderProduct) => {
    try {
      const response = await apiPut('/api/orders/product-status', {
        orderId: order.orderCode,
        productId: product.id,
        status: 'hazirlandi'
      });

      if (response.success) {
        await fetchOrders();
        toast.success('Üretim tamamlandı!');
      } else {
        toast.error(response.error || 'Üretim tamamlama başarısız');
      }
    } catch (error) {
      console.error('Üretim tamamlama hatası:', error);
      toast.error(error instanceof Error ? error.message : 'Üretim tamamlama sırasında bir hata oluştu');
    }
  };

  // Doğrudan durum değişikliği (modal olmadan - Hazırla/Hazırlandı geçişleri)
  const handleDirectStatusChange = async (order: OrderItem, product: OrderProduct, targetStatus: string) => {
    try {
      const response = await apiPut('/api/orders/product-status', {
        orderId: order.orderCode,
        productId: product.id,
        status: targetStatus,
        productionQuantity: product.quantity
      });

      if (response.success) {
        await fetchOrders();
        const label = targetStatus === 'hazirlaniyor' ? 'Hazırlanıyor' : 'Hazırlandı';
        toast.success(`Ürün durumu "${label}" olarak güncellendi`);
      } else {
        toast.error(response.error || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      toast.error('İşlem sırasında bir hata oluştu');
    }
  };

  // Üretim onaylandı
  const handleProductionConfirm = async (formData: ProductionFormData) => {
    if (!selectedOrderItem || !selectedProduct) return;

    try {
      const targetStatus = formData.skipProduction ? 'Hazırlandı' : 'Üretimde';
      
      const response = await apiPut('/api/orders/product-status', {
        orderId: selectedOrderItem.orderCode,
        productId: selectedProduct.id,
        status: targetStatus,
        productionQuantity: formData.productionQuantity,
        skipProduction: formData.skipProduction,
        selectedFilamentBobins: formData.selectedFilamentBobins
      });

      if (response.success) {
        await fetchOrders();
        toast.success(formData.skipProduction ? 'Stoktan kullanıldı! Sipariş hazırlanıyor...' : 'Üretim başarıyla başlatıldı!');
      } else {
        toast.error(response.error || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Üretim başlatma hatası:', error);
      toast.error('İşlem sırasında bir hata oluştu');
    } finally {
      // Modal'ları kapat
      setProductionModal(false);
      setSelectedOrderItem(null);
      setSelectedProduct(null);
    }
  };

  // Admin kontrolü
  if (user?.type !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Yetkisiz Erişim</h1>
            <p className="text-gray-600">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Üretim Takip</h1>
          
          {/* Filtre */}
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="tumu">Tümü</option>
              <option value={ORDER_STATUSES.PENDING}>Onay Bekliyor</option>
              <option value={ORDER_STATUSES.PRODUCING}>Üretimde</option>
              <option value={ORDER_STATUSES.PRODUCED}>Üretildi</option>
              <option value={ORDER_STATUSES.PREPARING}>Hazırlanıyor</option>
              <option value={ORDER_STATUSES.READY}>Hazırlandı</option>
            </select>
            
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Yenile
            </button>
          </div>
        </div>
        
        {/* Hata mesajı */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      
        {/* Yükleme durumu */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Siparişler yükleniyor...</p>
                      </div>
        ) : (
          <>
            {/* Sipariş sayısı */}
            <div className="mb-6">
              <p className="text-gray-600">
                Toplam {filteredOrders.length} sipariş gösteriliyor
              </p>
              </div>
              
            {/* Sipariş listesi */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Sipariş Bulunamadı</h3>
                <p className="text-gray-600">
                  {statusFilter === 'tumu' 
                    ? 'Henüz hiç sipariş bulunmuyor.' 
                    : 'Bu durumda sipariş bulunmuyor.'
                  }
                  </p>
                </div>
              ) : (
              <div className="grid gap-6">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onProductStatusChange={handleProductStatusChange}
                    onCompleteProduction={handleCompleteProduction}
                    onDirectStatusChange={handleDirectStatusChange}
                  />
                ))}
              </div>
            )}
          </>
      )}
      
        {/* Modal */}
        <ProductionModal
          isOpen={productionModal}
          onClose={() => {
            setProductionModal(false);
            setSelectedOrderItem(null);
            setSelectedProduct(null);
          }}
          onConfirm={handleProductionConfirm}
          selectedOrderItem={selectedOrderItem}
          selectedProduct={selectedProduct}
        />
      </div>
    </Layout>
  );
} 