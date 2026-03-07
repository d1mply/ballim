'use client';

import { Icons } from '../../utils/Icons';
import type { Odeme } from '../../types';
import { formatCurrency } from '../../hooks/useOdemelerData';

interface OdemelerTableProps {
  filteredOdemeler: Odeme[];
  selectedMusteriId: string | null;
  isLoading: boolean;
  onEdit: (odeme: Odeme) => void;
  onDelete: (id: string) => void;
  onPrintReceipt: (id: string) => void;
}

function StatusBadge({ durum }: { durum: string }) {
  const colorClass = durum === 'Ödendi'
    ? 'bg-green-100 text-green-800'
    : durum === 'Beklemede'
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800';

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
      {durum}
    </span>
  );
}

export default function OdemelerTable({
  filteredOdemeler, selectedMusteriId, isLoading, onEdit, onDelete, onPrintReceipt,
}: OdemelerTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (filteredOdemeler.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg">
        <p className="text-gray-500">
          {selectedMusteriId ? 'Bu müşteri için ödeme bulunamadı.' : 'Ödeme bulunamadı.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sipariş No</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödeme Yöntemi</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredOdemeler.map(odeme => (
            <tr key={odeme.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(odeme.odeme_tarihi).toLocaleDateString('tr-TR')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{odeme.musteri_adi}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {odeme.siparis_id ? `SIP-${String(odeme.siparis_id).padStart(3, '0')}` : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(odeme.tutar)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{odeme.odeme_yontemi}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <StatusBadge durum={odeme.durum} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{odeme.aciklama || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onPrintReceipt(odeme.id)} className="text-green-600 hover:text-green-900" title="Ödeme Makbuzu">
                    <Icons.EyeIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => onEdit(odeme)} className="text-indigo-600 hover:text-indigo-900" title="Düzenle">
                    <Icons.EditIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => onDelete(odeme.id)} className="text-red-600 hover:text-red-900" title="Sil">
                    <Icons.TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
