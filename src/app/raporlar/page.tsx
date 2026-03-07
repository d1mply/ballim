'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';

type TabType = 'sales' | 'inventory' | 'accounting';

interface SalesData {
  summary: { order_count: string; total_revenue: string; avg_order_value: string };
  monthlyRevenue: { month: string; order_count: string; revenue: string }[];
  topProducts: { product_code: string; product_type: string; total_sold: string }[];
  topCustomers: { name: string; customer_code: string; total_spent: string; order_count: string }[];
}

interface InventoryData {
  lowStock: { product_code: string; product_type: string; stock: string }[];
  summary: { total_products: string; total_stock: string };
}

interface AccountingData {
  balances: { name: string; customer_code: string; balance: string }[];
  summary: { totalDebt: number; totalCredit: number; customerCount: number };
}

const TABS: { key: TabType; label: string }[] = [
  { key: 'sales', label: 'Satış' },
  { key: 'inventory', label: 'Stok' },
  { key: 'accounting', label: 'Cari Hesap' },
];

function formatCurrency(val: string | number) {
  return Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });
}

export default function RaporlarPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [data, setData] = useState<SalesData | InventoryData | AccountingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (type: TabType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Rapor yüklenemedi');
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab, fetchReport]);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Raporlar</h1>

        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">Rapor yükleniyor...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {activeTab === 'sales' && <SalesTab data={data as SalesData} />}
            {activeTab === 'inventory' && <InventoryTab data={data as InventoryData} />}
            {activeTab === 'accounting' && <AccountingTab data={data as AccountingData} />}
          </>
        )}
      </div>
    </Layout>
  );
}

function SalesTab({ data }: { data: SalesData }) {
  const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => Number(m.revenue)), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Toplam Gelir" value={`₺${formatCurrency(data.summary.total_revenue)}`} />
        <StatCard label="Sipariş Sayısı" value={data.summary.order_count} />
        <StatCard label="Ort. Sipariş Değeri" value={`₺${formatCurrency(data.summary.avg_order_value)}`} />
      </div>

      <div className="bg-background border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-4">Aylık Gelir (Son 12 Ay)</h3>
        <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
          {data.monthlyRevenue.map((m, i) => {
            const pct = (Number(m.revenue) / maxRevenue) * 100;
            return (
              <div key={i} className="flex flex-col items-center flex-shrink-0 min-w-[48px]">
                <span className="text-[10px] text-muted-foreground mb-1">
                  ₺{formatCurrency(m.revenue)}
                </span>
                <div
                  className="w-8 bg-primary rounded-t-sm transition-all"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                  title={`${formatMonth(m.month)}: ₺${formatCurrency(m.revenue)}`}
                />
                <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                  {formatMonth(m.month)}
                </span>
              </div>
            );
          })}
          {data.monthlyRevenue.length === 0 && (
            <p className="text-muted-foreground text-sm w-full text-center py-10">Veri bulunamadı</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">En Çok Satan 10 Ürün</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2">Ürün Kodu</th>
                <th className="pb-2">Tür</th>
                <th className="pb-2 text-right">Satılan</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2 font-mono text-xs">{p.product_code}</td>
                  <td className="py-2">{p.product_type}</td>
                  <td className="py-2 text-right font-semibold">{p.total_sold}</td>
                </tr>
              ))}
              {data.topProducts.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Veri yok</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-background border border-border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">En Çok Harcayan 10 Müşteri</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2">Müşteri</th>
                <th className="pb-2 text-right">Harcama</th>
                <th className="pb-2 text-right">Sipariş</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers.map((c, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.customer_code}</div>
                  </td>
                  <td className="py-2 text-right">₺{formatCurrency(c.total_spent)}</td>
                  <td className="py-2 text-right">{c.order_count}</td>
                </tr>
              ))}
              {data.topCustomers.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Veri yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ data }: { data: InventoryData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Toplam Ürün" value={data.summary.total_products} />
        <StatCard label="Toplam Stok Adedi" value={data.summary.total_stock} />
      </div>

      <div className="bg-background border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-3">
          Düşük Stoklu Ürünler <span className="text-red-500">(&lt; 10 adet)</span>
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2">Ürün Kodu</th>
              <th className="pb-2">Tür</th>
              <th className="pb-2 text-right">Stok</th>
            </tr>
          </thead>
          <tbody>
            {data.lowStock.map((p, i) => {
              const stock = Number(p.stock);
              const colorClass =
                stock === 0 ? 'text-red-600 bg-red-50' : stock < 5 ? 'text-orange-600 bg-orange-50' : 'text-yellow-600 bg-yellow-50';
              return (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2 font-mono text-xs">{p.product_code}</td>
                  <td className="py-2">{p.product_type}</td>
                  <td className="py-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>
                      {stock}
                    </span>
                  </td>
                </tr>
              );
            })}
            {data.lowStock.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-green-600 font-medium">
                  Tüm ürünlerin stok seviyesi yeterli
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountingTab({ data }: { data: AccountingData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Toplam Alacak" value={`₺${formatCurrency(data.summary.totalDebt)}`} className="border-red-200" />
        <StatCard label="Toplam Fazla Ödeme" value={`₺${formatCurrency(data.summary.totalCredit)}`} className="border-green-200" />
        <StatCard label="Müşteri Sayısı" value={String(data.summary.customerCount)} />
      </div>

      <div className="bg-background border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-3">Müşteri Bakiyeleri</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="pb-2">Müşteri</th>
              <th className="pb-2">Kod</th>
              <th className="pb-2 text-right">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {data.balances.map((b, i) => {
              const balance = Number(b.balance);
              const colorClass = balance > 0 ? 'text-red-600' : 'text-green-600';
              return (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2 font-medium">{b.name}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{b.customer_code}</td>
                  <td className={`py-2 text-right font-semibold ${colorClass}`}>
                    {balance > 0 ? '+' : ''}₺{formatCurrency(Math.abs(balance))}
                  </td>
                </tr>
              );
            })}
            {data.balances.length === 0 && (
              <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Bakiye kaydı bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-background border border-border rounded-lg p-4 ${className}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
