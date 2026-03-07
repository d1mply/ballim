'use client';

import { useState } from 'react';
import { ProductData } from '../components/ProductModal';
import { LoggedInUser } from '../app/page';

export interface StockItem extends ProductData {
  stockAmount: number;
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  stockDisplay: string;
  stockStatus: string;
  quantity?: number;
  isPackage?: boolean;
  packageId?: string;
  price?: number;
}

interface UseCartOptions {
  currentUser: LoggedInUser | null;
}

export function useCart({ currentUser }: UseCartOptions) {
  const [cartItems, setCartItems] = useState<StockItem[]>([]);

  const addToCart = (item: StockItem) => {
    if (currentUser?.type !== 'customer') return;

    const orderedQuantity = 1;
    if (item.availableStock < orderedQuantity) {
      const proceed = confirm(
        `ℹ️ Stok Bilgisi\n\n` +
        `Ürün: ${item.code} - ${item.productType}\n` +
        `Mevcut Stok: ${item.availableStock} adet\n` +
        `Rezerve: ${item.reservedStock} adet\n` +
        `Sipariş: ${orderedQuantity} adet\n\n` +
        `Bu ürün rezerve edilecek ve üretim planına alınacak. Sipariş vermek istiyor musunuz?`
      );
      if (!proceed) return;
    }

    setCartItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id
            ? { ...i, quantity: (i.quantity || 1) + 1 }
            : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    if (currentUser?.type !== 'customer') return;
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const updateQuantity = async (index: number, newQuantity: number) => {
    if (currentUser?.type !== 'customer') return;
    if (newQuantity < 1) return;

    const item = cartItems[index];
    if (item && item.availableStock < newQuantity) {
      const proceed = confirm(
        `ℹ️ Stok Bilgisi\n\n` +
        `Ürün: ${item.code} - ${item.productType}\n` +
        `Mevcut Stok: ${item.availableStock} adet\n` +
        `Rezerve: ${item.reservedStock} adet\n` +
        `Sipariş: ${newQuantity} adet\n\n` +
        `Bu ürün rezerve edilecek ve üretim planına alınacak. Sipariş vermek istiyor musunuz?`
      );
      if (!proceed) return;
    }

    setCartItems(prevItems =>
      prevItems.map((item, i) =>
        i === index
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const addPackageToCart = (pkg: any) => {
    const packageItem = {
      id: `package-${pkg.id}`,
      code: pkg.package_code,
      productType: pkg.name,
      quantity: 1,
      isPackage: true,
      packageId: pkg.id,
      price: pkg.price,
    } as any;
    setCartItems(prev => [...prev, packageItem]);
  };

  const clearCart = () => setCartItems([]);

  return {
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    addPackageToCart,
    clearCart,
  };
}
