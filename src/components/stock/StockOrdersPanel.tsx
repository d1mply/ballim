'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '../../utils/Icons';
import { useToast } from '../../contexts/ToastContext';
import { createStockProductionOrder } from '../../lib/stock-production';

export interface StockProduct {
  id: string;
  code: string;
  productType: string;
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  stockDisplay: string;
  stockColor: string;
}

interface StockProductionOrder {
  id: number;
  orderCode: string;
  status: string;
  orderDate: string;
  notes: string;
  products: Array<{
    id: number;
    productCode: string;
    productName: string;
    quantity: number;
    status: string;
  }>;
}

interface StockOrdersPanelProps {
  products: StockProduct[];
  isProductsLoading: boolean;
  onRefreshProducts: () => void;
  isCreateModalOpen?: boolean;
  onCreateModalOpenChange?: (open: boolean) => void;
}

function getStatusColor(status: string) {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('onay') || statusLower.includes('bekliyor')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (statusLower.includes('üretim') || statusLower.includes('uretiliyor')) {
    return 'bg-blue-100 text-blue-800';
  }
  if (statusLower.includes('üretildi') || statusLower.includes('uretildi')) {
    return 'bg-purple-100 text-purple-800';
  }
  if (statusLower.includes('hazır') || statusLower.includes('hazirlandi')) {
    return 'bg-green-100 text-green-800';
  }
  return 'bg-gray-100 text-gray-800';
}

export default function StockOrdersPanel({
  products,
  isProductsLoading,
  onRefreshProducts,
  isCreateModalOpen,
  onCreateModalOpenChange,
}: StockOrdersPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const [stockOrders, setStockOrders] = useState<StockProductionOrder[]>([]);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = isCreateModalOpen ?? internalModalOpen;
  const setIsModalOpen = onCreateModalOpenChange ?? setInternalModalOpen;
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStockOrders = useCallback(async () => {
    try {
      setIsOrderLoading(true);
      const response = await fetch('/api/orders/production');
      if (!response.ok) throw new Error('Üretim emirleri yüklenemedi');

      const result = await response.json();
      const stockProductionOrders = (result.data || []).filter(
        (order: { order_code?: string }) => order.order_code?.startsWith('STK-')
      );

      setStockOrders(
        stockProductionOrders.map((order: Record<string, unknown>) => ({
          id: order.id as number,
          orderCode: order.order_code as string,
          status: order.status as string,
          orderDate: order.order_date as string,
          notes: (order.notes as string) || '',
          products: Array.isArray(order.products)
            ? order.products.map((p: Record<string, unknown>) => ({
                id: p.id as number,
                productCode: p.product_code as string,
                productName: p.product_name as string,
                quantity: (p.quantity as number) || 0,
                status: (p.status as string) || 'onay_bekliyor',
              }))
            : [],
        }))
      );
    } catch (err) {
      console.error('Stok üretim emirleri yüklenirken hata:', err);
    } finally {
      setIsOrderLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockOrders();
    const interval = setInterval(fetchStockOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchStockOrders]);

  useEffect(() => {
    if (isModalOpen) {
      setSelectedProduct(null);
      setQuantity(1);
      setNotes('');
    }
  }, [isModalOpen]);

  const handleCreateOrder = async () => {
    if (!selectedProduct || quantity <= 0) {
      toast.warning('Lütfen ürün ve adet seçin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createStockProductionOrder({
        productId: selectedProduct.id,
        quantity,
        notes: notes || 'Stok Yönetimi sayfasından oluşturuldu',
      });
      toast.success(`Üretim emri oluşturuldu! (${result.order?.order_code || 'STK-XXX'})`);

      setIsModalOpen(false);
      setSelectedProduct(null);
      setQuantity(1);
      setNotes('');
      await fetchStockOrders();
      onRefreshProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = stockOrders.filter(
    (order) =>
      order.orderCode.toLowerCase().includes(orderSearch.toLowerCase()) ||
      order.products.some(
        (p) =>
          p.productCode.toLowerCase().includes(orderSearch.toLowerCase()) ||
          p.productName.toLowerCase().includes(orderSearch.toLowerCase())
      )
  );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Üretim Emirleri</h2>

      <div className="bg-card border border-border p-4 rounded-lg">
        <div className="search-container">
          <Icons.SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Üretim emri veya ürün ara..."
            className="w-full"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isOrderLoading ? (
          <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>Henüz stok üretim emri yok.</p>
            <p className="text-sm mt-2">Sağ üstteki &quot;Yeni Üretim Emri&quot; butonunu kullanın.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="p-2 text-left">Emir Kodu</th>
                  <th className="p-2 text-left">Ürün</th>
                  <th className="p-2 text-left">Adet</th>
                  <th className="p-2 text-left">Durum</th>
                  <th className="p-2 text-left">Tarih</th>
                  <th className="p-2 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border">
                    <td className="p-2 font-mono font-medium text-primary">{order.orderCode}</td>
                    <td className="p-2">
                      {order.products.map((product) => (
                        <div key={product.id} className="text-sm">
                          {product.productName}{' '}
                          <span className="text-muted-foreground">({product.productCode})</span>
                        </div>
                      ))}
                    </td>
                    <td className="p-2">
                      {order.products.map((product) => (
                        <div key={product.id} className="text-sm">{product.quantity} adet</div>
                      ))}
                    </td>
                    <td className="p-2">
                      {order.products.map((product) => (
                        <span
                          key={product.id}
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium mr-1 ${getStatusColor(product.status)}`}
                        >
                          {product.status}
                        </span>
                      ))}
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {new Date(order.orderDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => router.push('/uretim-takip')}
                        className="text-primary hover:underline text-sm"
                      >
                        Üretim Takip →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">Yeni Stok Üretim Emri</h2>
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                &times;
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ürün Seç</label>
                {isProductsLoading ? (
                  <p className="text-sm text-muted-foreground">Ürünler yükleniyor...</p>
                ) : products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ürün bulunamadı.</p>
                ) : (
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const product = products.find((p) => p.id === e.target.value);
                      setSelectedProduct(product || null);
                    }}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    <option value="">Ürün seçin...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.code} - {product.productType} (Stok: {product.availableStock})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Adet</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notlar (Opsiyonel)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full h-24"
                  placeholder="Üretim amacı, özel notlar..."
                  disabled={isSubmitting}
                />
              </div>

              {selectedProduct && (
                <div className="bg-secondary/50 p-3 rounded-lg text-sm space-y-1">
                  <p><span className="font-medium">Kod:</span> {selectedProduct.code}</p>
                  <p><span className="font-medium">Mevcut stok:</span> {selectedProduct.availableStock} adet</p>
                  <p><span className="font-medium">Rezerve:</span> {selectedProduct.reservedStock} adet</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsModalOpen(false)} className="btn-secondary" disabled={isSubmitting}>
                İptal
              </button>
              <button
                onClick={handleCreateOrder}
                className="btn-primary"
                disabled={!selectedProduct || quantity <= 0 || isSubmitting}
              >
                {isSubmitting ? 'Oluşturuluyor...' : 'Üretim Emri Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
