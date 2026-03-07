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
  monthlySpending?: { month: string; amount: number }[];
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

const STATUS_STEPS = ['Beklemede', 'Üretimde', 'Tamamlandı'];

const STATUS_ICONS: Record<string, string> = {
  'Beklemede': '⏳',
  'Üretimde': '⚙️',
  'Tamamlandı': '✅',
};

function StatusTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1 mt-1">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx && currentIdx >= 0;
        return (
          <React.Fragment key={step}>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${done ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'}`}
              title={step}
            >
              {STATUS_ICONS[step]}
            </span>
            {i < STATUS_STEPS.length - 1 && (
              <span className={`w-4 h-0.5 ${done && i < currentIdx ? 'bg-blue-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function SpendingChart({ data }: { data: { month: string; amount: number }[] }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Aylık Harcama Trendi</h2>
      <div className="flex items-end gap-3 h-32">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-foreground">
              {new Intl.NumberFormat('tr-TR', { notation: 'compact' }).format(d.amount)}
            </span>
            <div
              className="w-full bg-blue-500 rounded-t-md transition-all min-h-[4px]"
              style={{ height: `${(d.amount / max) * 100}%` }}
            />
            <span className="text-xs text-muted-foreground">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const [stats, setStats] = useState<CustomerStats>({
    totalOrders: 0, totalSpent: 0, pendingOrders: 0,
    completedOrders: 0, currentBalance: 0, favoriteProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<CustomerOrder[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: number; name?: string; username?: string } | null>(null);
  const toast = useToast();

  useEffect(() => {
    try {
      const userJson = localStorage.getItem('loggedUser');
      if (userJson) {
        const user = JSON.parse(userJson);
        setCurrentUser(user);
        if (user.id) fetchCustomerData(Number(user.id));
        else setLoading(false);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const fetchCustomerData = async (customerId: number) => {
    try {
      setLoading(true);
      const [statsRes, ordersRes, paymentsRes] = await Promise.all([
        fetch(`/api/customer-stats/${customerId}`),
        fetch(`/api/customer-orders/${customerId}?limit=5`),
        fetch(`/api/customer-payments/${customerId}?limit=5`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setRecentOrders(Array.isArray(data) ? data.slice(0, 5) : []);
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setRecentPayments(Array.isArray(data) ? data.slice(0, 5) : []);
      }
    } catch {
      toast.error('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const cls: Record<string, string> = {
      'Beklemede': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Onay Bekliyor': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Üretimde': 'bg-blue-100 text-blue-800 border-blue-200',
      'Tamamlandı': 'bg-green-100 text-green-800 border-green-200',
      'İptal': 'bg-red-100 text-red-800 border-red-200',
      'Kargoda': 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${cls[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status}
      </span>
    );
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n);

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return s; }
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

  const statCards = [
    { label: 'Toplam Siparişler', value: stats.totalOrders, sub: `${stats.pendingOrders} beklemede`, icon: Icons.ShoppingCartIcon, color: 'blue', link: '/siparis-takip', linkText: 'Tümünü gör →' },
    { label: 'Toplam Harcama', value: fmt(stats.totalSpent), sub: `${stats.completedOrders} tamamlanan`, icon: Icons.CreditCardIcon, color: 'green', link: '/cari-hesap', linkText: 'Detaylar →' },
    { label: 'Cari Hesap', value: fmt(Math.abs(stats.currentBalance)), sub: stats.currentBalance >= 0 ? 'Alacak' : 'Borç', icon: Icons.ReceiptIcon, color: 'yellow', link: '/cari-hesap', linkText: 'Detaylar →', valueClass: stats.currentBalance >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'Bekleyen Sipariş', value: stats.pendingOrders, sub: 'Aktif siparişler', icon: Icons.PackageIcon, color: 'purple', link: '/siparis-takip', linkText: 'Takip et →' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm text-white rounded-full text-2xl font-bold border-2 border-white/30">
                {(currentUser?.name || currentUser?.username || 'M')?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">Hoş Geldiniz, {currentUser?.name || currentUser?.username || 'Müşteri'}!</h1>
                <p className="text-white/90 font-medium">Hesap durumunuz ve sipariş geçmişiniz</p>
              </div>
            </div>
            <Link
              href="/stok-siparis"
              className="bg-white text-blue-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow"
            >
              + Sipariş Oluştur
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <div key={c.label} className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                  <p className={`text-3xl font-bold mt-2 ${c.valueClass || 'text-foreground'}`}>{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                </div>
                <div className={`bg-${c.color}-500/10 p-3 rounded-lg`}>
                  <c.icon className={`w-8 h-8 text-${c.color}-500`} />
                </div>
              </div>
              <Link href={c.link} className="text-xs text-primary hover:underline mt-4 inline-block">{c.linkText}</Link>
            </div>
          ))}
        </div>

        {/* Monthly Spending */}
        {stats.monthlySpending && stats.monthlySpending.length > 0 && (
          <SpendingChart data={stats.monthlySpending} />
        )}

        {/* Orders & Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Son Siparişlerim</h2>
              <Link href="/siparis-takip" className="text-sm text-primary hover:underline font-medium">Tümünü Gör →</Link>
            </div>
            <div className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Henüz sipariş bulunmuyor</div>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-semibold text-foreground">{order.order_code}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(order.order_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{fmt(order.total_amount)}</p>
                        <div className="mt-1">{getStatusBadge(order.status)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <StatusTimeline status={order.status} />
                      <Link
                        href="/stok-siparis"
                        className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors font-medium"
                      >
                        Tekrar Sipariş
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Son Ödemelerim</h2>
              <Link href="/cari-hesap" className="text-sm text-primary hover:underline font-medium">Tümünü Gör →</Link>
            </div>
            <div className="divide-y divide-border">
              {recentPayments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Henüz ödeme bulunmuyor</div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{payment.aciklama || 'Ödeme'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fmtDate(payment.odeme_tarihi)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{fmt(payment.tutar)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{payment.odeme_yontemi}</p>
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
