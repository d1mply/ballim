import { useState, useMemo, useCallback } from 'react';
import { ProductData } from '../components/ProductModal';

interface ToastActions {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
}

type ProductForPackage = Pick<ProductData, 'id' | 'code' | 'productType' | 'pieceGram'> & {
  availableStock?: number;
};

export function usePackageCreation(
  productsList: ProductForPackage[],
  mutatePackages: () => Promise<unknown>
) {
  const [packageStep, setPackageStep] = useState<1 | 2 | 3>(1);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState(0);
  const [packageDescription, setPackageDescription] = useState('');
  const [targetWeightGram, setTargetWeightGram] = useState(300);
  const [tolerancePercent, setTolerancePercent] = useState(10);
  const [packageItems, setPackageItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [contentMode, setContentMode] = useState<'variety' | 'rows'>('variety');
  const [varietyCount, setVarietyCount] = useState(8);
  const [quantityPerVariety, setQuantityPerVariety] = useState(7);
  const [varietyProductIds, setVarietyProductIds] = useState<string[]>([]);
  const [forceCreateOutOfTolerance, setForceCreateOutOfTolerance] = useState(false);
  const [isPackageSubmitting, setIsPackageSubmitting] = useState(false);

  const packageItemsForApi = useMemo(() => {
    if (contentMode === 'variety') {
      return varietyProductIds
        .filter(Boolean)
        .map((productId) => ({ productId: parseInt(productId, 10), quantity: quantityPerVariety }));
    }
    return packageItems
      .filter((i) => i.productId && i.quantity > 0)
      .map((i) => ({ productId: parseInt(i.productId, 10), quantity: i.quantity }));
  }, [contentMode, varietyProductIds, quantityPerVariety, packageItems]);

  const packageTotalGram = useMemo(() => {
    return packageItemsForApi.reduce((sum, item) => {
      const p = productsList.find((x) => String(x.id) === String(item.productId));
      const pieceGram = p?.pieceGram ? Number(p.pieceGram) : 0;
      return sum + pieceGram * item.quantity;
    }, 0);
  }, [packageItemsForApi, productsList]);

  const toleranceMin = targetWeightGram * (1 - tolerancePercent / 100);
  const toleranceMax = targetWeightGram * (1 + tolerancePercent / 100);
  const isWithinTolerance = packageTotalGram >= toleranceMin && packageTotalGram <= toleranceMax;
  const hasPackageContent = packageItemsForApi.length > 0;

  const openPackageModal = useCallback(() => setIsPackageModalOpen(true), []);

  const closePackageModal = useCallback(() => {
    setIsPackageModalOpen(false);
    setPackageStep(1);
    setPackageName('');
    setPackagePrice(0);
    setPackageDescription('');
    setTargetWeightGram(300);
    setTolerancePercent(10);
    setPackageItems([]);
    setContentMode('variety');
    setVarietyCount(8);
    setQuantityPerVariety(7);
    setVarietyProductIds([]);
    setForceCreateOutOfTolerance(false);
  }, []);

  const setVarietyCountWithResize = useCallback((n: number) => {
    const count = Math.max(1, n);
    setVarietyCount(count);
    setVarietyProductIds((prev) =>
      prev.slice(0, count).concat(Array(Math.max(0, count - prev.length)).fill(''))
    );
  }, []);

  const submitPackage = useCallback(
    async (toast: ToastActions) => {
      if (!packageName || packagePrice <= 0 || packageItemsForApi.length === 0) {
        toast.warning('Paket adı, fiyat ve en az bir ürün gerekli.');
        return;
      }
      if (!isWithinTolerance && !forceCreateOutOfTolerance) return;
      setIsPackageSubmitting(true);
      try {
        const response = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: packageName,
            description: packageDescription,
            price: packagePrice,
            items: packageItemsForApi.map((item) => ({
              productId: parseInt(String(item.productId), 10),
              quantity: item.quantity,
            })),
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Paket oluşturulamadı');
        }
        const result = await response.json();
        toast.success(`Paket oluşturuldu: ${result.package?.package_code || 'PAK-XXX'}`);
        await mutatePackages();
        closePackageModal();
      } catch (err) {
        console.error('Paket oluşturma hatası:', err);
        toast.error(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      } finally {
        setIsPackageSubmitting(false);
      }
    },
    [
      packageName,
      packagePrice,
      packageDescription,
      packageItemsForApi,
      isWithinTolerance,
      forceCreateOutOfTolerance,
      mutatePackages,
      closePackageModal,
    ]
  );

  return {
    packageStep,
    setPackageStep,
    isPackageModalOpen,
    packageName,
    setPackageName,
    packagePrice,
    setPackagePrice,
    packageDescription,
    setPackageDescription,
    targetWeightGram,
    setTargetWeightGram,
    tolerancePercent,
    setTolerancePercent,
    packageItems,
    setPackageItems,
    contentMode,
    setContentMode,
    varietyCount,
    setVarietyCount: setVarietyCountWithResize,
    quantityPerVariety,
    setQuantityPerVariety,
    varietyProductIds,
    setVarietyProductIds,
    forceCreateOutOfTolerance,
    setForceCreateOutOfTolerance,
    isPackageSubmitting,
    packageItemsForApi,
    packageTotalGram,
    toleranceMin,
    toleranceMax,
    isWithinTolerance,
    hasPackageContent,
    openPackageModal,
    closePackageModal,
    submitPackage,
  };
}
