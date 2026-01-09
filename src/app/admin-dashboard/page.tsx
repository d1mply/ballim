'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import { useToast } from '../../contexts/ToastContext';
import Link from 'next/link';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingOrders: number;
  criticalStock: number;
  completedOrders: number;
  activeCustomers: number;
  todayOrders: number;
  todayRevenue: number;
  todayNewCustomers: number;
  monthlyRevenue: number;
}

interface FilamentCosts {
  summary: {
    totalCost: number;
    totalAmount: number;
    purchaseCount: number;
    avgPricePerGram: number;
    avgDailyCost: number;
  };
}

interface RecentOrder {
  id: number;
  order_code: string;
  customer_name: string;
  order_date: string;
  total_amount: number;
  status: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    criticalStock: 0,
    completedOrders: 0,
    activeCustomers: 0,
    todayOrders: 0,
    todayRevenue: 0,
    todayNewCustomers: 0,
    monthlyRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [filamentCosts, setFilamentCosts] = useState<FilamentCosts | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Dashboard istatistiklerini al
      const statsResponse = await fetch('/api/dashboard-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Son siparişleri al
      const ordersResponse = await fetch('/api/orders?limit=10');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const list = Array.isArray(ordersData) ? ordersData : (ordersData.data || []);
        const formattedOrders = list.map((order: any) => ({
          id: order.id,
          order_code: order.orderCode || order.order_code || String(order.id),
          customer_name: order.customerName || order.customer_name || 'Bilinmeyen',
          order_date: order.orderDate || order.order_date || new Date().toISOString(),
          total_amount: order.totalAmount || order.total_amount || 0,
          status: order.status || 'Beklemede'
        }));
        setRecentOrders(formattedOrders.slice(0, 10));
      }

      // Filament maliyetlerini al
      const filamentCostsResponse = await fetch('/api/dashboard/filament-costs?period=month');
      if (filamentCostsResponse.ok) {
        const filamentData = await filamentCostsResponse.json();
        setFilamentCosts(filamentData);
      }
    } catch (error) {
      console.error('Dashboard verisi alınırken hata:', error);
      toast.error('Dashboard verileri yüklenirken bir hata oluştu');
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
        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Sistem genel bakış ve istatistikler</p>
          </div>
        </div>

        {/* Günlük İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bugünkü Siparişler */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Bugünkü Siparişler</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.todayOrders}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {formatCurrency(stats.todayRevenue)} gelir
                </p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <Icons.ShoppingCartIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Bugünkü Gelir */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Bugünkü Gelir</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{formatCurrency(stats.todayRevenue)}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.todayOrders} sipariş
                </p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <Icons.CreditCardIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Yeni Müşteriler (Bugün) */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Yeni Müşteriler</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{stats.todayNewCustomers}</p>
                <p className="text-xs text-purple-600 mt-1">
                  Bugün kayıt olan
                </p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Icons.UsersIcon className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Ana İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Toplam Ürünler */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Toplam Ürünler</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.totalProducts}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <Icons.PackageIcon className="w-8 h-8 text-primary" />
              </div>
            </div>
            <Link href="/urunler" prefetch={true} className="text-xs text-primary hover:underline mt-4 inline-block">
              Tümünü gör →
            </Link>
          </div>

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
            <Link href="/siparis-takip" prefetch={true} className="text-xs text-primary hover:underline mt-4 inline-block">
              Tümünü gör →
            </Link>
          </div>

          {/* Aylık Gelir */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bu Ay Gelir</p>
                <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(stats.monthlyRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <Icons.TrendingUpIcon className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
            <Link href="/odemeler" prefetch={true} className="text-xs text-primary hover:underline mt-4 inline-block">
              Detaylar →
            </Link>
          </div>

          {/* Filament Maliyetleri */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filament Maliyeti</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {filamentCosts ? formatCurrency(filamentCosts.summary.totalCost) : '₺0'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bu ay
                </p>
              </div>
              <div className="bg-orange-500/10 p-3 rounded-lg">
                <Icons.CubeIcon className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <Link href="/filamentler" prefetch={true} className="text-xs text-primary hover:underline mt-4 inline-block">
              Detaylar →
            </Link>
          </div>
        </div>

        {/* Hızlı Erişim Butonları */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Hızlı Erişim</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link 
              href="/urunler"
              prefetch={true}
              className="flex flex-col items-center justify-center p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors group"
            >
              <Icons.PackageIcon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Ürünler</span>
            </Link>
            <Link 
              href="/siparis-takip"
              prefetch={true}
              className="flex flex-col items-center justify-center p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors group"
            >
              <Icons.ShoppingCartIcon className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Siparişler</span>
            </Link>
            <Link 
              href="/musteriler"
              prefetch={true}
              className="flex flex-col items-center justify-center p-4 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors group"
            >
              <Icons.UsersIcon className="w-6 h-6 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Müşteriler</span>
            </Link>
            <Link 
              href="/stok-yonetimi"
              prefetch={true}
              className="flex flex-col items-center justify-center p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors group"
            >
              <Icons.WarehouseIcon className="w-6 h-6 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Stok</span>
            </Link>
            <Link 
              href="/filamentler"
              prefetch={true}
              className="flex flex-col items-center justify-center p-4 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition-colors group"
            >
              <Icons.CubeIcon className="w-6 h-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Filamentler</span>
            </Link>
            <Link 
              href="/uretim-takip"
              prefetch={true}
              className="flex flex-col items-center justify-center p-4 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors group"
            >
              <Icons.ClipboardListIcon className="w-6 h-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground">Üretim</span>
            </Link>
          </div>
        </div>

        {/* Uyarılar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Kritik Stok Uyarısı */}
          {stats.criticalStock > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Icons.WarehouseIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Kritik Stok Uyarısı</p>
                  <p className="text-sm text-red-700 mt-1">
                    {stats.criticalStock} ürünün stoğu kritik seviyede
                  </p>
                </div>
                <Link 
                  href="/stok-yonetimi" 
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Kontrol Et →
                </Link>
              </div>
            </div>
          )}

          {/* Bekleyen Siparişler */}
          {stats.pendingOrders > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Icons.ClockIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900">Bekleyen Siparişler</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {stats.pendingOrders} sipariş onay bekliyor
                  </p>
                </div>
                <Link 
                  href="/siparis-takip" 
                  className="text-sm font-medium text-yellow-600 hover:text-yellow-700"
                >
                  İncele →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Son Siparişler */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Son Siparişler</h2>
            <Link 
              href="/siparis-takip" 
              className="text-sm text-primary hover:underline font-medium"
            >
              Tümünü Gör →
            </Link>
          </div>
          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Henüz sipariş bulunmuyor
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-foreground">Sipariş Kodu</th>
                    <th className="p-3 text-left text-sm font-semibold text-foreground">Müşteri</th>
                    <th className="p-3 text-left text-sm font-semibold text-foreground">Tarih</th>
                    <th className="p-3 text-left text-sm font-semibold text-foreground">Tutar</th>
                    <th className="p-3 text-left text-sm font-semibold text-foreground">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                      <td className="p-3 text-sm font-medium text-foreground">{order.order_code}</td>
                      <td className="p-3 text-sm text-foreground">{order.customer_name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{formatDate(order.order_date)}</td>
                      <td className="p-3 text-sm font-semibold text-foreground">{formatCurrency(order.total_amount)}</td>
                      <td className="p-3">{getStatusBadge(order.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
