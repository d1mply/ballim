'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import { useToast } from '../../contexts/ToastContext';
import Link from 'next/link';

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
  products?: { code: string; name: string; quantity: number }[];
}

interface RecentPayment {
  id: number;
  odeme_tarihi: string;
  tutar: number;
  odeme_yontemi: string;
  aciklama: string;
}

interface FavoriteProduct {
  id: number;
  productId: number;
  product: {
    id: number;
    code: string;
    productType: string;
    image: string | null;
    stockQuantity: number;
  };
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
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: number; name?: string; username?: string } | null>(null);
  const toast = useToast();

  useEffect(() => {
    try {
      const userJson = localStorage.getItem('loggedUser');
      if (userJson) {
        const user = JSON.parse(userJson);
        setCurrentUser(user);
        if (user.id) {
          fetchCustomerData(Number(user.id));
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi okunamadı:', error);
      setLoading(false);
    }
  }, []);

  const fetchCustomerData = async (customerId: number) => {
    try {
      setLoading(true);
      
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
        setRecentOrders(Array.isArray(ordersData) ? ordersData.slice(0, 5) : []);
      }

      // Son ödemeleri al
      const paymentsResponse = await fetch(`/api/customer-payments/${customerId}?limit=5`);
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setRecentPayments(Array.isArray(paymentsData) ? paymentsData.slice(0, 5) : []);
      }

      // Favori ürünleri al
      const favoritesResponse = await fetch(`/api/favorites?customerId=${customerId}`);
      if (favoritesResponse.ok) {
        const favoritesData = await favoritesResponse.json();
        setFavoriteProducts(Array.isArray(favoritesData) ? favoritesData.slice(0, 6) : []);
      }
    } catch (error) {
      console.error('Müşteri verisi alınırken hata:', error);
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      'Beklemede': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Onay Bekliyor': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Üretimde': 'bg-blue-100 text-blue-800 border-blue-200',
      'Tamamlandı': 'bg-green-100 text-green-800 border-green-200',
      'İptal': 'bg-red-100 text-red-800 border-red-200',
      'Kargoda': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Yükleniyor...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hoş Geldiniz Başlığı */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-lg p-6 shadow-lg border border-blue-800/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm text-white rounded-full text-2xl font-bold border-2 border-white/30">
              {(currentUser?.name || currentUser?.username || 'M')?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1 text-white drop-shadow-sm">Hoş Geldiniz, {currentUser?.name || currentUser?.username || 'Müşteri'}!</h1>
              <p className="text-white/95 font-medium">Hesap durumunuz ve sipariş geçmişiniz</p>
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Toplam Siparişler */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam Siparişler</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingOrders} beklemede
                </p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <Icons.ShoppingCartIcon className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <Link href="/siparis-takip" className="text-xs text-primary hover:underline mt-4 inline-block">
              Tümünü gör →
            </Link>
          </div>

          {/* Toplam Harcama */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam Harcama</p>
                <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(stats.totalSpent)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completedOrders} tamamlanan
                </p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg">
                <Icons.CreditCardIcon className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <Link href="/cari-hesap" className="text-xs text-primary hover:underline mt-4 inline-block">
              Detaylar →
            </Link>
          </div>

          {/* Cari Hesap */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cari Hesap</p>
                <p className={`text-3xl font-bold mt-2 ${stats.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(stats.currentBalance))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.currentBalance >= 0 ? 'Alacak' : 'Borç'}
                </p>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-lg">
                <Icons.ReceiptIcon className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <Link href="/cari-hesap" className="text-xs text-primary hover:underline mt-4 inline-block">
              Detaylar →
            </Link>
          </div>

          {/* Favori Ürünler */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Favori Ürünler</p>
                <p className="text-3xl font-bold text-foreground mt-2">{favoriteProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kayıtlı ürünler
                </p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-lg">
                <Icons.PackageIcon className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <Link href="/urunler" className="text-xs text-primary hover:underline mt-4 inline-block">
              Ürünlere git →
            </Link>
          </div>
        </div>

        {/* Favori Ürünler */}
        {favoriteProducts.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Favori Ürünlerim</h2>
              <Link href="/urunler" className="text-sm text-primary hover:underline font-medium">
                Tümünü Gör →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {favoriteProducts.map((fav) => (
                <Link
                  key={fav.id}
                  href={`/urunler?product=${fav.productId}`}
                  className="group relative aspect-square bg-secondary rounded-lg overflow-hidden hover:shadow-lg transition-all"
                >
                  {fav.product.image ? (
                    <img
                      src={fav.product.image}
                      alt={fav.product.productType}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icons.PackageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs">
                    <p className="font-medium truncate">{fav.product.code}</p>
                    <p className="text-xs opacity-75">Stok: {fav.product.stockQuantity}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Son Siparişler ve Ödemeler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Son Siparişler */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Son Siparişlerim</h2>
              <Link href="/siparis-takip" className="text-sm text-primary hover:underline font-medium">
                Tümünü Gör →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Henüz sipariş bulunmuyor
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-foreground">{order.order_code}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(order.order_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(order.total_amount)}</p>
                        <div className="mt-1">{getStatusBadge(order.status)}</div>
                      </div>
                    </div>
                    {order.products && order.products.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {order.products.length} ürün
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Son Ödemeler */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Son Ödemelerim</h2>
              <Link href="/cari-hesap" className="text-sm text-primary hover:underline font-medium">
                Tümünü Gör →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentPayments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Henüz ödeme bulunmuyor
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{payment.aciklama || 'Ödeme'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(payment.odeme_tarihi)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(payment.tutar)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {payment.odeme_yontemi}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
