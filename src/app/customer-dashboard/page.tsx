'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';

interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  pendingOrders: number;
  completedOrders: number;
  currentBalance: number;
  favoriteProducts: number;
}

interface CustomerOrder {
  id: number;
  order_code: string;
  order_date: string;
  total_amount: number;
  status: string;
  products: { code: string; name: string; quantity: number }[];
}

interface RecentPayment {
  id: number;
  odeme_tarihi: string;
  tutar: number;
  odeme_yontemi: string;
  aciklama: string;
}

export default function CustomerDashboard() {
  const [stats, setStats] = useState<CustomerStats>({
    totalOrders: 0,
    totalSpent: 0,
    pendingOrders: 0,
    completedOrders: 0,
    currentBalance: 0,
    favoriteProducts: 0
  });
  const [recentOrders, setRecentOrders] = useState<CustomerOrder[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    const userJson = localStorage.getItem('loggedUser');
    if (userJson) {
      const user = JSON.parse(userJson);
      setCurrentUser(user);
      fetchCustomerData(user.id);
    }
  }, []);

  const fetchCustomerData = async (customerId: number) => {
    try {
      // Müşteri istatistiklerini al
      const statsResponse = await fetch(`/api/customer-stats/${customerId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Müşterinin son siparişlerini al
      const ordersResponse = await fetch(`/api/customer-orders/${customerId}?limit=5`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setRecentOrders(ordersData.slice(0, 5));
      }

      // Son ödemeleri al
      const paymentsResponse = await fetch(`/api/customer-payments/${customerId}?limit=5`);
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setRecentPayments(paymentsData.slice(0, 5));
      }
    } catch (error) {
      console.error('Müşteri verisi alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'Beklemede': 'bg-yellow-100 text-yellow-800',
      'Üretimde': 'bg-blue-100 text-blue-800',
      'Tamamlandı': 'bg-green-100 text-green-800',
      'İptal': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Nakit':
        return '💵';
      case 'Kredi Kartı':
        return '💳';
      case 'Banka Transferi':
        return '🏦';
      default:
        return '💰';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Yükleniyor...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary to-accent text-white rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-white/20 text-white rounded-full text-2xl font-bold">
              {currentUser?.name?.charAt(0) || '👤'}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2 text-black">ULUDAĞ3D HOŞGELDİNİZ</h1>
              <p className="text-lg opacity-90 text-black">BALLİM İLE SİPARİŞLERİNİZİ YÖNET</p>
              <p className="text-sm opacity-75 mt-1">Merhaba {currentUser?.name}, hesap durumunuz ve sipariş geçmişiniz</p>
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Toplam Sipariş</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <Icons.ShoppingCartIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card-secondary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Toplam Harcama</p>
                <p className="text-2xl font-bold">₺{(stats.totalSpent || 0).toLocaleString()}</p>
              </div>
              <Icons.TrendingUpIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card-warning">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Bekleyen Sipariş</p>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
              </div>
              <Icons.ClockIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card-danger">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Mevcut Bakiye</p>
                <p className="text-2xl font-bold">₺{(stats.currentBalance || 0).toLocaleString()}</p>
              </div>
              <Icons.CreditCardIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tamamlanan Sipariş</p>
                <p className="text-2xl font-bold">{stats.completedOrders}</p>
              </div>
              <Icons.CheckCircleIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card-secondary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Favori Ürünler</p>
                <p className="text-2xl font-bold">{stats.favoriteProducts}</p>
              </div>
              <Icons.PackageIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>
        </div>

        {/* Son Siparişler ve Ödemeler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Son Siparişler */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="text-lg font-semibold">Son Siparişlerim</h2>
            </div>
            <div className="content-card-body">
              {recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{order.order_code}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.order_date).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">₺{(order.total_amount || 0).toLocaleString()}</p>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                      {order.products && order.products.length > 0 && (
                        <div className="text-xs text-gray-600">
                          {order.products.slice(0, 2).map((product: { code: string; name: string; quantity: number }, index: number) => (
                            <span key={index}>
                              {product.name} ({product.quantity} adet)
                              {index < Math.min(2, order.products.length - 1) && ', '}
                            </span>
                          ))}
                          {order.products.length > 2 && ` ve ${order.products.length - 2} ürün daha`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Henüz sipariş bulunmuyor
                </div>
              )}
            </div>
          </div>

          {/* Son Ödemeler */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="text-lg font-semibold">Son Ödemelerim</h2>
            </div>
            <div className="content-card-body">
              {recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{payment.aciklama}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.odeme_tarihi).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">₺{(payment.tutar || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <span>{getPaymentMethodIcon(payment.odeme_yontemi)}</span>
                            {payment.odeme_yontemi}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Henüz ödeme bulunmuyor
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hızlı Erişim */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="content-card">
            <div className="content-card-body text-center">
              <Icons.PackageIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Ürün Kataloğu</h3>
              <p className="text-sm text-gray-600 mb-3">Mevcut ürünleri incele</p>
              <a href="/urunler" className="btn-primary inline-block">Ürünlere Git</a>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-body text-center">
              <Icons.ShoppingCartIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Sipariş Ver</h3>
              <p className="text-sm text-gray-600 mb-3">Yeni sipariş oluştur</p>
              <a href="/stok-siparis" className="btn-primary inline-block">Sipariş Ver</a>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-body text-center">
              <Icons.ClockIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Sipariş Takip</h3>
              <p className="text-sm text-gray-600 mb-3">Siparişlerini takip et</p>
              <a href="/siparis-takip" className="btn-primary inline-block">Takip Et</a>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-body text-center">
              <Icons.CreditCardIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Cari Hesap</h3>
              <p className="text-sm text-gray-600 mb-3">Hesap durumunu gör</p>
              <a href="/cari-hesap" className="btn-primary inline-block">Hesabı Gör</a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 