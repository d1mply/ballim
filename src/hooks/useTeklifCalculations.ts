import { useState, useEffect, useCallback } from 'react';
import type { Product, FilamentType, PriceRange } from './useTeklifData';

export interface QuoteItem {
  id: string;
  productId: number | null;
  productName: string;
  productWeight: number;
  quantity: number;
  filamentType: string;
  normalPrice: number;
  wholesalePrice: number;
}

export type KdvType = 'plus' | 'included' | 'no-invoice';
export type WholesalePricingMode = 'discount' | 'gram';

export interface KdvResult {
  basePrice: number;
  kdvAmount: number;
  totalPrice: number;
}

export interface Totals {
  normalTotal: number;
  wholesaleTotal: number;
  basePrice: number;
  kdvAmount: number;
  totalWithKdv: number;
}

interface Params {
  products: Product[];
  filamentTypes: FilamentType[];
  priceRanges: PriceRange[];
}

export function useTeklifCalculations({ products, filamentTypes, priceRanges }: Params) {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteNumber, setQuoteNumber] = useState(`TK-${Date.now().toString().slice(-6)}`);
  const [wholesalePricingMode, setWholesalePricingMode] = useState<WholesalePricingMode>('discount');
  const [wholesaleDiscountRate, setWholesaleDiscountRate] = useState(50);
  const [wholesaleGramPrice, setWholesaleGramPrice] = useState(5);
  const [kdvType, setKdvType] = useState<KdvType>('plus');

  const calculateKdv = useCallback((price: number): KdvResult => {
    const kdvRate = 0.20;
    switch (kdvType) {
      case 'plus':
        return {
          basePrice: price,
          kdvAmount: price * kdvRate,
          totalPrice: price * (1 + kdvRate)
        };
      case 'included': {
        const base = price / (1 + kdvRate);
        return { basePrice: base, kdvAmount: price - base, totalPrice: price };
      }
      case 'no-invoice':
      default:
        return { basePrice: price, kdvAmount: 0, totalPrice: price };
    }
  }, [kdvType]);

  const calculatePrices = useCallback((item: QuoteItem) => {
    if (!item.productId || item.quantity <= 0) {
      return { normalPrice: 0, wholesalePrice: 0 };
    }

    const totalGrams = item.productWeight * item.quantity;
    let wholesalePrice = 0;
    let normalPrice = 0;

    if (wholesalePricingMode === 'gram') {
      const filament = filamentTypes.find(f => f.type === item.filamentType);
      normalPrice = totalGrams * (filament?.price || 8);
      wholesalePrice = totalGrams * wholesaleGramPrice;
    } else {
      const range = priceRanges.find(r =>
        item.productWeight >= r.minGram && item.productWeight < r.maxGram
      );
      if (range) {
        normalPrice = range.price * item.quantity;
        wholesalePrice = normalPrice * (1 - wholesaleDiscountRate / 100);
      } else {
        const filament = filamentTypes.find(f => f.type === item.filamentType);
        normalPrice = totalGrams * (filament?.price || 8);
        wholesalePrice = 0;
      }
    }

    return { normalPrice, wholesalePrice };
  }, [wholesalePricingMode, wholesaleDiscountRate, wholesaleGramPrice, filamentTypes, priceRanges]);

  const addQuoteItem = () => {
    setQuoteItems(prev => [...prev, {
      id: Date.now().toString(),
      productId: null,
      productName: '',
      productWeight: 0,
      quantity: 1,
      filamentType: 'PLA',
      normalPrice: 0,
      wholesalePrice: 0
    }]);
  };

  const updateQuoteItem = (id: string, field: keyof QuoteItem, value: any) => {
    setQuoteItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== id) return item;

        let updatedItem = { ...item, [field]: value };

        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          if (product) {
            updatedItem.productName = `${product.code} - ${product.productType}`;
            updatedItem.productWeight = product.capacity;
          } else {
            updatedItem.productName = '';
            updatedItem.productWeight = 0;
          }
        }

        const prices = calculatePrices(updatedItem);
        updatedItem.normalPrice = prices.normalPrice;
        updatedItem.wholesalePrice = prices.wholesalePrice;
        return updatedItem;
      })
    );
  };

  const removeQuoteItem = (id: string) => {
    setQuoteItems(prev => prev.filter(item => item.id !== id));
  };

  const recalculateAll = useCallback(() => {
    setQuoteItems(prevItems =>
      prevItems.map(item => {
        const prices = calculatePrices(item);
        return { ...item, normalPrice: prices.normalPrice, wholesalePrice: prices.wholesalePrice };
      })
    );
  }, [calculatePrices]);

  useEffect(() => {
    recalculateAll();
  }, [recalculateAll]);

  const getTotals = (): Totals => {
    const normalTotal = quoteItems.reduce((sum, item) => sum + item.normalPrice, 0);
    const wholesaleTotal = quoteItems.reduce((sum, item) => sum + item.wholesalePrice, 0);
    const kdvCalculation = calculateKdv(wholesaleTotal);

    return {
      normalTotal,
      wholesaleTotal,
      basePrice: kdvCalculation.basePrice,
      kdvAmount: kdvCalculation.kdvAmount,
      totalWithKdv: kdvCalculation.totalPrice
    };
  };

  return {
    quoteItems,
    quoteNumber, setQuoteNumber,
    wholesalePricingMode, setWholesalePricingMode,
    wholesaleDiscountRate, setWholesaleDiscountRate,
    wholesaleGramPrice, setWholesaleGramPrice,
    kdvType, setKdvType,
    addQuoteItem, updateQuoteItem, removeQuoteItem,
    getTotals
  };
}
