'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import { useToast } from '../../contexts/ToastContext';

interface AuditLog {
  id: number;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const toast = useToast();

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });

      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.action) params.append('action', filters.action);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
        console.error('API hatası:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Loglar yüklenemedi`);
      }

      const data = await response.json();
      setLogs(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (error) {
      console.error('Log yükleme hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Loglar yüklenirken bir hata oluştu';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'VIEW': return 'bg-gray-100 text-gray-800';
      case 'LOGIN': return 'bg-purple-100 text-purple-800';
      case 'LOGOUT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="space-y-5 w-full">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Audit Log (İşlem Geçmişi)</h1>
        </div>

        {/* Filtreler */}
        <div className="bg-card border border-border p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Varlık Tipi</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
                value={filters.entityType}
                onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              >
                <option value="">Tümü</option>
                <option value="PRODUCT">Ürün</option>
                <option value="FILAMENT">Filament</option>
                <option value="ORDER">Sipariş</option>
                <option value="CUSTOMER">Müşteri</option>
                <option value="PAYMENT">Ödeme</option>
                <option value="PACKAGE">Paket</option>
                <option value="STOCK">Stok</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">İşlem</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">Tümü</option>
                <option value="CREATE">Oluştur</option>
                <option value="UPDATE">Güncelle</option>
                <option value="DELETE">Sil</option>
                <option value="VIEW">Görüntüle</option>
                <option value="LOGIN">Giriş</option>
                <option value="LOGOUT">Çıkış</option>
                <option value="EXPORT">Dışarı Aktar</option>
                <option value="IMPORT">İçeri Aktar</option>
                <option value="STATUS_CHANGE">Durum Değişikliği</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Başlangıç Tarihi</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bitiş Tarihi</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ara</label>
              <input
                type="text"
                placeholder="İsim, detay..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Log Listesi */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Log bulunamadı</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-secondary">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold">Tarih</th>
                    <th className="p-3 text-left text-sm font-semibold">Kullanıcı</th>
                    <th className="p-3 text-left text-sm font-semibold">İşlem</th>
                    <th className="p-3 text-left text-sm font-semibold">Varlık</th>
                    <th className="p-3 text-left text-sm font-semibold">Detay</th>
                    <th className="p-3 text-left text-sm font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-secondary/50">
                      <td className="p-3 text-sm">{formatDate(log.createdAt)}</td>
                      <td className="p-3 text-sm">
                        {log.userName || log.userId || 'Sistem'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        <div>
                          <span className="font-medium">{log.entityType}</span>
                          {log.entityName && (
                            <div className="text-xs text-muted-foreground">{log.entityName}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {log.details && (
                          <details className="cursor-pointer">
                            <summary className="text-primary hover:underline text-xs">Detayları göster</summary>
                            <pre className="mt-2 text-xs bg-secondary p-2 rounded overflow-auto max-w-md">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Sayfa {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
                >
                  Önceki
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

