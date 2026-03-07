'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';

export interface PriceRange {
  id: number;
  minGram: number;
  maxGram: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceRangeForm {
  minGram: string;
  maxGram: string;
  price: string;
}

export interface UsePriceRangesReturn {
  priceRanges: PriceRange[];
  showPriceRanges: boolean;
  setShowPriceRanges: (show: boolean) => void;
  priceRangeForm: PriceRangeForm;
  editingPriceRange: PriceRange | null;
  handlePriceRangeFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePriceRangeSave: () => Promise<void>;
  handlePriceRangeEdit: (priceRange: PriceRange) => void;
  handlePriceRangeDelete: (id: number) => Promise<void>;
  resetPriceRangeForm: () => void;
}

const EMPTY_FORM: PriceRangeForm = { minGram: '', maxGram: '', price: '' };

export function usePriceRanges(): UsePriceRangesReturn {
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [showPriceRanges, setShowPriceRanges] = useState(false);
  const [priceRangeForm, setPriceRangeForm] = useState<PriceRangeForm>(EMPTY_FORM);
  const [editingPriceRange, setEditingPriceRange] = useState<PriceRange | null>(null);

  const toast = useToast();

  const fetchPriceRanges = useCallback(async () => {
    try {
      const response = await fetch('/api/wholesale-price-ranges');
      if (response.ok) {
        const data = await response.json();
        setPriceRanges(data);
      }
    } catch (error) {
      console.error('Fiyat aralıkları yüklenirken hata:', error);
    }
  }, []);

  useEffect(() => {
    if (showPriceRanges) {
      fetchPriceRanges();
    }
  }, [showPriceRanges, fetchPriceRanges]);

  const handlePriceRangeFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPriceRangeForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePriceRangeSave = useCallback(async () => {
    const { minGram, maxGram, price } = priceRangeForm;

    if (!minGram || !maxGram || !price) {
      toast.warning('Tüm alanları doldurun');
      return;
    }

    const minGramNum = parseFloat(minGram);
    const maxGramNum = parseFloat(maxGram);
    const priceNum = parseFloat(price);

    if (minGramNum >= maxGramNum) {
      toast.warning('Min gram, max gramdan küçük olmalı');
      return;
    }

    try {
      const method = editingPriceRange ? 'PUT' : 'POST';
      const body = editingPriceRange
        ? { id: editingPriceRange.id, minGram: minGramNum, maxGram: maxGramNum, price: priceNum }
        : { minGram: minGramNum, maxGram: maxGramNum, price: priceNum };

      const response = await fetch('/api/wholesale-price-ranges', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchPriceRanges();
        setPriceRangeForm(EMPTY_FORM);
        setEditingPriceRange(null);
        toast.success(editingPriceRange ? 'Fiyat aralığı güncellendi!' : 'Fiyat aralığı eklendi!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Fiyat aralığı kaydetme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  }, [priceRangeForm, editingPriceRange, fetchPriceRanges, toast]);

  const handlePriceRangeEdit = useCallback((priceRange: PriceRange) => {
    setEditingPriceRange(priceRange);
    setPriceRangeForm({
      minGram: priceRange.minGram.toString(),
      maxGram: priceRange.maxGram.toString(),
      price: priceRange.price.toString(),
    });
  }, []);

  const handlePriceRangeDelete = useCallback(async (id: number) => {
    if (!confirm('Bu fiyat aralığını silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/wholesale-price-ranges?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchPriceRanges();
        toast.success('Fiyat aralığı silindi!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Fiyat aralığı silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  }, [fetchPriceRanges, toast]);

  const resetPriceRangeForm = useCallback(() => {
    setPriceRangeForm(EMPTY_FORM);
    setEditingPriceRange(null);
  }, []);

  return {
    priceRanges, showPriceRanges, setShowPriceRanges,
    priceRangeForm, editingPriceRange,
    handlePriceRangeFormChange, handlePriceRangeSave,
    handlePriceRangeEdit, handlePriceRangeDelete, resetPriceRangeForm,
  };
}
