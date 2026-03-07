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

      setFilamentTypes([
        { type: 'PLA', price: 8 },
        { type: 'ABS', price: 10 },
        { type: 'PETG', price: 12 }
      ]);

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
