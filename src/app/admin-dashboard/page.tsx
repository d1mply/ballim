'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { 
  PackageIcon, 
  ShoppingCartIcon, 
  UsersIcon, 
  CreditCardIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  ClockIcon
} from '@/utils/Icons';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingOrders: number;
  criticalStock: number;
  completedOrders: number;
  activeCustomers: number;
}

interface FilamentCost {
  type: string;
  totalUsed: number;
  totalCost: number;
  averageCostPerKg: number;
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
    activeCustomers: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filament maliyet verileri
  const [filamentCosts, setFilamentCosts] = useState<FilamentCost[] | null>(null);
  const [costLoading, setCostLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchFilamentCosts();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Dashboard istatistiklerini al
      const statsResponse = await fetch('/api/dashboard-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Son siparişleri al
      const ordersResponse = await fetch('/api/orders?limit=5');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        // API'den gelen veriyi admin dashboard formatına çevir
        const formattedOrders = ordersData.map((order: RecentOrder) => ({
          id: order.id,
          order_code: order.orderCode || order.order_code,
          customer_name: order.customerName || order.customer_name,
          order_date: order.orderDate || order.order_date,
          total_amount: order.totalAmount || order.total_amount,
          status: order.status
        }));
        setRecentOrders(formattedOrders.slice(0, 5));
      }
    } catch (error) {
      console.error('Dashboard verisi alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilamentCosts = async () => {
    try {
      setCostLoading(true);
      
      const response = await fetch('/api/dashboard/filament-costs?period=month');
      
      if (response.ok) {
        const data = await response.json();
        setFilamentCosts(data);
      }
    } catch (error) {
      console.error('Filament maliyet verileri yüklenirken hata:', error);
    } finally {
      setCostLoading(false);
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
              🎯
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2 text-black">ULUDAĞ3D HOŞGELDİNİZ</h1>
              <p className="text-lg opacity-90 text-black">BALLİM İLE SİPARİŞLERİNİZİ YÖNET</p>
              <p className="text-sm opacity-75 mt-1">Sistemin genel durumu ve önemli metrikler</p>
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Toplam Ürün</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <PackageIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card-secondary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Toplam Sipariş</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <ShoppingCartIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card-warning">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Bekleyen Sipariş</p>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
              </div>
              <ClockIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card-danger">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Kritik Stok</p>
                <p className="text-2xl font-bold">{stats.criticalStock}</p>
              </div>
              <AlertTriangleIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Toplam Müşteri</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
              <UsersIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>

          <div className="dashboard-card-secondary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Toplam Gelir</p>
                <p className="text-2xl font-bold">₺{(stats.totalRevenue || 0).toLocaleString()}</p>
              </div>
              <TrendingUpIcon className="w-8 h-8 opacity-80" />
            </div>
          </div>
        </div>

        {/* Filament Maliyet Dashboard */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">💰 Aylık Filament Maliyeti</h2>
          
          {costLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Maliyet verileri yükleniyor...</div>
            </div>
          ) : filamentCosts ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {filamentCosts.summary.totalCost.toFixed(2)}₺
                </div>
                <div className="text-sm text-muted-foreground">Toplam Maliyet</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-foreground">
                  {(filamentCosts.summary.totalAmount / 1000).toFixed(1)}kg
                </div>
                <div className="text-sm text-muted-foreground">Toplam Miktar</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">
                  {filamentCosts.summary.avgPricePerGram.toFixed(3)}₺
                </div>
                <div className="text-sm text-muted-foreground">Ortalama Fiyat/gr</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {filamentCosts.summary.purchaseCount}
                </div>
                <div className="text-sm text-muted-foreground">Alım Sayısı</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Bu ay henüz filament alımı yapılmamış
            </div>
          )}
        </div>

        {/* Son Siparişler */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="text-lg font-semibold">Son Siparişler</h2>
          </div>
          <div className="content-card-body">
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sipariş Kodu</th>
                      <th>Müşteri</th>
                      <th>Tarih</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="font-medium">{order.order_code}</td>
                        <td>{order.customer_name}</td>
                        <td>
                          {typeof order.order_date === 'string' && order.order_date.includes('/') 
                            ? order.order_date 
                            : new Date(order.order_date).toLocaleDateString('tr-TR')
                          }
                        </td>
                        <td>₺{(order.total_amount || 0).toLocaleString()}</td>
                        <td>{getStatusBadge(order.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Henüz sipariş bulunmuyor
              </div>
            )}
          </div>
        </div>

        {/* Hızlı Erişim */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="content-card">
            <div className="content-card-body text-center">
              <PackageIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Ürün Yönetimi</h3>
              <p className="text-sm text-gray-600 mb-3">Ürün ekle, düzenle ve stok takibi yap</p>
              <a href="/urunler" className="btn-primary inline-block">Ürünlere Git</a>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-body text-center">
              <ShoppingCartIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Sipariş Yönetimi</h3>
              <p className="text-sm text-gray-600 mb-3">Siparişleri takip et ve yönet</p>
              <a href="/siparis-takip" className="btn-primary inline-block">Siparişlere Git</a>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-body text-center">
              <UsersIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Müşteri Yönetimi</h3>
              <p className="text-sm text-gray-600 mb-3">Müşteri bilgilerini yönet</p>
              <a href="/musteriler" className="btn-primary inline-block">Müşterilere Git</a>
            </div>
          </div>

          <div className="content-card">
            <div className="content-card-body text-center">
              <CreditCardIcon className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Cari Hesap</h3>
              <p className="text-sm text-gray-600 mb-3">Müşteri hesaplarını takip et</p>
              <a href="/cari-hesap" className="btn-primary inline-block">Cari Hesaba Git</a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 