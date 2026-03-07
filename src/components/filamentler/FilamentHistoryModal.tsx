'use client';

import { useState, useCallback } from 'react';
import { FilamentData } from '../FilamentModal';
import { useToast } from '../../contexts/ToastContext';

interface HistoryItem {
  usage_date?: string;
  created_at?: string;
  amount: number;
  before_weight?: number;
  after_weight?: number;
  product_code?: string;
  order_code?: string;
  description?: string;
}

interface FilamentHistoryModalProps {
  isOpen: boolean;
  historyFor: { id: string; code: string } | null;
  historyLoading: boolean;
  historyItems: HistoryItem[];
  onClose: () => void;
}

export interface UseFilamentHistoryReturn {
  isHistoryOpen: boolean;
  historyLoading: boolean;
  historyItems: HistoryItem[];
  historyFor: { id: string; code: string } | null;
  handleShowHistory: (filament: FilamentData) => Promise<void>;
  closeHistory: () => void;
}

export function useFilamentHistory(): UseFilamentHistoryReturn {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyFor, setHistoryFor] = useState<{ id: string; code: string } | null>(null);

  const toast = useToast();

  const handleShowHistory = useCallback(async (filament: FilamentData) => {
    try {
      setHistoryFor({ id: String(filament.id), code: filament.code });
      setIsHistoryOpen(true);
      setHistoryLoading(true);
      const res = await fetch(`/api/filament-usage?filamentId=${filament.id}&limit=100`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `API hatası: ${res.status}`);
      }
      const rows = await res.json();
      setHistoryItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error('Geçmiş yüklenirken hata:', err);
      toast.error('Geçmiş yüklenirken bir hata oluştu');
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);

  return { isHistoryOpen, historyLoading, historyItems, historyFor, handleShowHistory, closeHistory };
}

export default function FilamentHistoryModal({
  isOpen, historyFor, historyLoading, historyItems, onClose,
}: FilamentHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content max-w-3xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">
            Kullanım Geçmişi {historyFor ? `- ${historyFor.code}` : ''}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {historyLoading ? (
            <div className="py-8 text-center">Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm">Tarih</th>
                    <th className="px-3 py-2 text-left text-sm">Kullanılan (g)</th>
                    <th className="px-3 py-2 text-left text-sm">Önce/ Sonra (g)</th>
                    <th className="px-3 py-2 text-left text-sm">Ürün</th>
                    <th className="px-3 py-2 text-left text-sm">Sipariş</th>
                    <th className="px-3 py-2 text-left text-sm">Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                        Kayıt yok
                      </td>
                    </tr>
                  ) : (
                    historyItems.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2 text-sm">
                          {new Date(it.usage_date || it.created_at || '').toLocaleString('tr-TR')}
                        </td>
                        <td className="px-3 py-2 text-sm">{it.amount}</td>
                        <td className="px-3 py-2 text-sm">
                          {it.before_weight ?? '-'} / {it.after_weight ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-sm">{it.product_code || '-'}</td>
                        <td className="px-3 py-2 text-sm">{it.order_code || '-'}</td>
                        <td className="px-3 py-2 text-sm">{it.description || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer mt-4">
          <button onClick={onClose} className="btn-primary">Kapat</button>
        </div>
      </div>
    </div>
  );
}
