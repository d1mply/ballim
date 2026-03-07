import { useState, useEffect, useCallback } from 'react';
import type { Odeme } from '../types';

export interface OdemeDateRange {
  startDate: string;
  endDate: string;
}

export function useOdemelerFilters(odemeler: Odeme[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<OdemeDateRange>({ startDate: '', endDate: '' });
  const [filteredOdemeler, setFilteredOdemeler] = useState<Odeme[]>([]);

  const filterOdemeler = useCallback(() => {
    if (!odemeler.length) {
      setFilteredOdemeler([]);
      return;
    }

    let filtered = [...odemeler];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.musteri_adi.toLowerCase().includes(searchLower) ||
        o.odeme_yontemi.toLowerCase().includes(searchLower) ||
        (o.aciklama && o.aciklama.toLowerCase().includes(searchLower))
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(o => o.durum === statusFilter);
    }

    if (dateRange.startDate) {
      filtered = filtered.filter(o =>
        new Date(o.odeme_tarihi) >= new Date(dateRange.startDate)
      );
    }

    if (dateRange.endDate) {
      filtered = filtered.filter(o =>
        new Date(o.odeme_tarihi) <= new Date(dateRange.endDate)
      );
    }

    setFilteredOdemeler(filtered);
  }, [odemeler, searchTerm, statusFilter, dateRange]);

  useEffect(() => {
    filterOdemeler();
  }, [filterOdemeler]);

  return {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    dateRange, setDateRange,
    filteredOdemeler,
  };
}
