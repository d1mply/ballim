'use client';

import { useState, useEffect } from 'react';
import type { StockItem } from './useCart';
import type { LoggedInUser } from '../app/page';

export function truncate2(value: number): number {
  if (!isFinite(value)) return 0;
  return Math.trunc(value * 100) / 100;
}

interface UsePriceCalculationOptions {
  cartItems: StockItem[];
  currentUser: LoggedInUser | null;
  kdvRate: number;
}

export function usePriceCalculation({
  cartItems,
  currentUser,
  kdvRate,
}: UsePriceCalculationOptions) {
  const [cartPrices, setCartPrices] = useState<Record<string, number>>({});

  const getItemPrice = async (
    item: StockItem,
    quantity: number = 1,
  ): Promise<number> => {
    const defaultPrice = 10;

    if (currentUser?.type !== 'customer') {
      return defaultPrice;
    }

    const requestData = {
      customerId: currentUser.id,
      productId: item.id,
      quantity,
      filamentType: item.filaments?.[0]?.type || 'PLA',
    };

    try {
      const response = await fetch('/api/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const priceData = await response.json();
        return priceData.totalPrice || defaultPrice;
      }
      const errorText = await response.text();
      console.error('API hatası:', response.status, errorText);
      return defaultPrice;
    } catch (error) {
      console.error('Fiyat hesaplama hatası:', error);
      return defaultPrice;
    }
  };

  const getFilamentPrice = (item: StockItem): number => {
    if (currentUser?.type === 'customer' && currentUser?.filamentPrices) {
      const filamentType = item.filaments?.[0]?.type;
      if (filamentType) {
        const customerPrice = currentUser.filamentPrices.find(
          fp => fp.type.toLowerCase() === filamentType.toLowerCase(),
        );
        if (customerPrice) return customerPrice.price;
      }
    }
    return 1;
  };

  useEffect(() => {
    const calculateCartPrices = async () => {
      if (!currentUser || cartItems.length === 0) return;

      const newPrices: Record<string, number> = {};

      for (const item of cartItems) {
        const key = `${item.id}-${item.quantity}`;
        try {
          const price = await getItemPrice(item, item.quantity || 1);
          newPrices[key] = price;
        } catch (error) {
          console.error(`Fiyat hesaplama hatası ${item.id}:`, error);
          newPrices[key] = 0;
        }
      }

      setCartPrices(newPrices);
    };

    calculateCartPrices();
  }, [cartItems, currentUser]);

  const subTotal = truncate2(
    cartItems.reduce((total, item) => {
      const key = `${item.id}-${item.quantity}`;
      return total + (cartPrices[key] || 0);
    }, 0),
  );

  const kdvAmount = truncate2(subTotal * (kdvRate / 100));
  const displayTotal = truncate2(subTotal + kdvAmount);

  return {
    cartPrices,
    getItemPrice,
    getFilamentPrice,
    subTotal,
    kdvAmount,
    displayTotal,
  };
}
