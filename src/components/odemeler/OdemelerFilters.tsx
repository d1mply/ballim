'use client';

import { Icons } from '../../utils/Icons';
import type { OdemeCustomer } from '../../types';
import type { OdemeDateRange } from '../../hooks/useOdemelerFilters';

interface OdemelerFiltersProps {
  customers: OdemeCustomer[];
  selectedMusteriId: string | null;
  searchTerm: string;
  statusFilter: string;
  dateRange: OdemeDateRange;
  onMusteriChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateRangeChange: (partial: Partial<OdemeDateRange>) => void;
}

const inputClass = 'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50';

export default function OdemelerFilters({
  customers, selectedMusteriId, searchTerm, statusFilter, dateRange,
  onMusteriChange, onSearchChange, onStatusChange, onDateRangeChange,
}: OdemelerFiltersProps) {
  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label htmlFor="musteri" className="block text-sm font-medium mb-1">Müşteri Seçin</label>
        <select id="musteri" className={inputClass} value={selectedMusteriId || ''} onChange={onMusteriChange}>
          <option value="">Tüm Müşteriler</option>
          {customers.map(customer => (
            <option key={customer.id} value={customer.id}>
              {customer.name} {customer.company ? `(${customer.company})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="search" className="block text-sm font-medium mb-1">Ara</label>
        <div className="search-container">
          <Icons.SearchIcon className="search-icon" />
          <input
            type="text"
            id="search"
            className={`block ${inputClass}`}
            placeholder="Müşteri, açıklama veya ödeme yöntemi ara..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="statusFilter" className="block text-sm font-medium mb-1">Durum</label>
        <select id="statusFilter" className={inputClass} value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="Ödendi">Ödendi</option>
          <option value="Beklemede">Beklemede</option>
          <option value="İptal Edildi">İptal Edildi</option>
        </select>
      </div>

      <div className="flex gap-2">
        <div className="w-1/2">
          <label htmlFor="startDate" className="block text-sm font-medium mb-1">Başlangıç</label>
          <input
            type="date"
            id="startDate"
            className={`block ${inputClass}`}
            value={dateRange.startDate}
            onChange={(e) => onDateRangeChange({ startDate: e.target.value })}
          />
        </div>
        <div className="w-1/2">
          <label htmlFor="endDate" className="block text-sm font-medium mb-1">Bitiş</label>
          <input
            type="date"
            id="endDate"
            className={`block ${inputClass}`}
            value={dateRange.endDate}
            onChange={(e) => onDateRangeChange({ endDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
