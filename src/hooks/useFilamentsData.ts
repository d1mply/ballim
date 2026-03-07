'use client';

import { useState, useEffect, useCallback } from 'react';
import { FilamentData } from '../components/FilamentModal';
import { StockAddData } from '../components/StockAddModal';
import { useToast } from '../contexts/ToastContext';

export interface UseFilamentsDataReturn {
  filamentsList: FilamentData[];
  isLoading: boolean;
  error: string | null;
  filteredFilaments: FilamentData[];
  types: string[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  typeFilter: string;
  setTypeFilter: (filter: string) => void;
  selectedFilament: FilamentData | null;
  isModalOpen: boolean;
  isStockModalOpen: boolean;
  selectedFilamentForStock: FilamentData | null;
  handleAddFilament: () => void;
  handleEditFilament: (filament: FilamentData) => void;
  handleSaveFilament: (filamentData: FilamentData) => Promise<void>;
  handleDeleteFilament: (filamentId: string) => Promise<void>;
  handleAddStock: (filament: FilamentData) => void;
  handleSaveStock: (stockData: StockAddData) => Promise<void>;
  closeFilamentModal: () => void;
  closeStockModal: () => void;
  calculateRemainingPercentage: (filament: FilamentData) => number;
  isStockCritical: (filament: FilamentData) => boolean;
  formatWeight: (grams: number) => string;
}

export function useFilamentsData(): UseFilamentsDataReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [filamentsList, setFilamentsList] = useState<FilamentData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilament, setSelectedFilament] = useState<FilamentData | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedFilamentForStock, setSelectedFilamentForStock] = useState<FilamentData | null>(null);

  const toast = useToast();

  useEffect(() => {
    const fetchFilaments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/filaments');
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setFilamentsList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Filament verilerini getirirken hata:', err);
        setError('Filament verileri yüklenirken bir hata oluştu.');
        setFilamentsList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFilaments();
  }, []);

  const filteredFilaments = filamentsList.filter((filament) => {
    try {
      const searchLower = searchTerm.toLowerCase();
      const typeMatch = typeFilter === '' || filament.type === typeFilter;
      return (
        ((filament.code && filament.code.toLowerCase().includes(searchLower)) ||
        (filament.name && filament.name.toLowerCase().includes(searchLower)) ||
        (filament.brand && filament.brand.toLowerCase().includes(searchLower)) ||
        (filament.color && filament.color.toLowerCase().includes(searchLower))) &&
        typeMatch
      );
    } catch {
      return false;
    }
  });

  const types = Array.from(new Set(filamentsList.map(filament => filament.type)));

  const handleAddFilament = useCallback(() => {
    setSelectedFilament(null);
    setIsModalOpen(true);
  }, []);

  const handleEditFilament = useCallback((filament: FilamentData) => {
    setSelectedFilament(filament);
    setIsModalOpen(true);
  }, []);

  const handleSaveFilament = useCallback(async (filamentData: FilamentData) => {
    try {
      if (selectedFilament) {
        const response = await fetch('/api/filaments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedFilament.id, ...filamentData }),
        });
        if (!response.ok) throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        const updatedFilament = await response.json();
        setFilamentsList(prev => prev.map(item => item.id === selectedFilament.id ? updatedFilament : item));
        toast.success('Filament başarıyla güncellendi!');
      } else {
        const response = await fetch('/api/filaments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filamentData),
        });
        if (!response.ok) throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        const newFilament = await response.json();
        setFilamentsList(prev => [...prev, newFilament]);
        toast.success('Filament başarıyla eklendi!');
      }
    } catch (error) {
      console.error('Filament kaydedilirken hata:', error);
      toast.error('Filament kaydedilirken bir hata oluştu!');
      return;
    }
    setIsModalOpen(false);
  }, [selectedFilament, toast]);

  const handleDeleteFilament = useCallback(async (filamentId: string) => {
    const confirmDelete = window.confirm('Bu filamenti silmek istediğinize emin misiniz?');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/filaments?id=${filamentId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.resolvable && data?.productLinks === 0 && (data?.usageLogs || 0) > 0) {
          const confirmForce = window.confirm(
            `Bu filamentin kullanım geçmişi var (${data.usageLogs} kayıt). Geçmişi de silerek filamentin tamamını kaldırmak ister misiniz? Bu işlem geri alınamaz.`
          );
          if (confirmForce) {
            const forceRes = await fetch(`/api/filaments?id=${filamentId}&force=true`, { method: 'DELETE' });
            const forceData = await forceRes.json().catch(() => null);
            if (!forceRes.ok) throw new Error(forceData?.error || `API hatası: ${forceRes.status} ${forceRes.statusText}`);
            setFilamentsList(prev => prev.filter(item => String(item.id) !== String(filamentId)));
            toast.success('Filament ve kullanım geçmişi silindi');
            return;
          }
        }
        throw new Error(data?.error || `API hatası: ${response.status} ${response.statusText}`);
      }
      setFilamentsList(prev => prev.filter(item => String(item.id) !== String(filamentId)));
      toast.success('Filament başarıyla silindi');
    } catch (error) {
      console.error('Filament silinirken hata:', error);
      toast.error(`Filament silinirken bir hata oluştu: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [toast]);

  const handleAddStock = useCallback((filament: FilamentData) => {
    setSelectedFilamentForStock(filament);
    setIsStockModalOpen(true);
  }, []);

  const handleSaveStock = useCallback(async (stockData: StockAddData) => {
    try {
      const response = await fetch('/api/filaments/add-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData),
      });
      if (!response.ok) throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      const result = await response.json();
      setFilamentsList(prev => prev.map(item => item.id === stockData.filamentId ? result.filament : item));
      setIsStockModalOpen(false);
      setSelectedFilamentForStock(null);
      toast.success(result.message || 'Stok başarıyla eklendi!');
    } catch (error) {
      console.error('Stok eklenirken hata:', error);
      toast.error('Stok eklenirken bir hata oluştu!');
    }
  }, [toast]);

  const closeFilamentModal = useCallback(() => setIsModalOpen(false), []);
  const closeStockModal = useCallback(() => setIsStockModalOpen(false), []);

  const calculateRemainingPercentage = useCallback((filament: FilamentData) => {
    return (filament.remainingWeight / filament.totalWeight) * 100;
  }, []);

  const isStockCritical = useCallback((filament: FilamentData) => {
    return filament.remainingWeight <= filament.criticalStock;
  }, []);

  const formatWeight = useCallback((grams: number) => {
    const roundedG = Math.round(grams || 0);
    if (roundedG >= 1000) {
      const kg = roundedG / 1000;
      const kgStr = (Math.trunc(kg * 1000) / 1000).toFixed(3).replace(/\.0+$/, '').replace(/\.$/, '');
      return `${roundedG}g (${kgStr}kg)`;
    }
    return `${roundedG}g`;
  }, []);

  return {
    filamentsList, isLoading, error, filteredFilaments, types,
    searchTerm, setSearchTerm, typeFilter, setTypeFilter,
    selectedFilament, isModalOpen, isStockModalOpen, selectedFilamentForStock,
    handleAddFilament, handleEditFilament, handleSaveFilament, handleDeleteFilament,
    handleAddStock, handleSaveStock, closeFilamentModal, closeStockModal,
    calculateRemainingPercentage, isStockCritical, formatWeight,
  };
}
