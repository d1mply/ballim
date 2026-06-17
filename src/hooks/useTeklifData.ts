import { useState, useEffect } from 'react';

export interface Product {
  id: number;
  code: string;
  productType: string;
  capacity: number;
}

export interface FilamentType {
  type: string;
  price: number;
}

export interface PriceRange {
  id: number;
  minGram: number;
  maxGram: number;
  price: number;
  isActive: boolean;
}

export function useTeklifData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filamentTypes, setFilamentTypes] = useState<FilamentType[]>([]);
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const productsRes = await fetch('/api/products');
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const formattedProducts = productsData.map((p: any) => ({
          id: p.id,
          code: p.code || p.product_code || '',
          productType: p.productType || p.product_type || '',
          capacity: p.pieceGram || p.capacity || 5
        }));
        setProducts(formattedProducts);
      }

      const filamentsRes = await fetch('/api/filaments');
      if (filamentsRes.ok) {
        const filamentsData = await filamentsRes.json();
        const pricesByType = new Map<string, number[]>();

        for (const filament of filamentsData) {
          const type = filament.type as string;
          const pricePerGram = Number(filament.pricePerGram) || 0;
          if (!type || pricePerGram <= 0) continue;
          const list = pricesByType.get(type) ?? [];
          list.push(pricePerGram);
          pricesByType.set(type, list);
        }

        const dynamicTypes = Array.from(pricesByType.entries()).map(([type, prices]) => ({
          type,
          price: prices.reduce((sum, value) => sum + value, 0) / prices.length,
        }));

        setFilamentTypes(
          dynamicTypes.length > 0
            ? dynamicTypes
            : [
                { type: 'PLA', price: 0 },
                { type: 'ABS', price: 0 },
                { type: 'PETG', price: 0 },
              ]
        );
      } else {
        setFilamentTypes([
          { type: 'PLA', price: 0 },
          { type: 'ABS', price: 0 },
          { type: 'PETG', price: 0 },
        ]);
      }

      const rangesRes = await fetch('/api/wholesale-price-ranges');
      if (rangesRes.ok) {
        const rangesData = await rangesRes.json();
        setPriceRanges(rangesData);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  return { products, filamentTypes, priceRanges, loading };
}
