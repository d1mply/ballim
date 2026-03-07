'use client';

import { Icons } from '../../utils/Icons';
import { useToast } from '../../contexts/ToastContext';
import type { StockItem } from '../../hooks/useCart';
import type { LoggedInUser } from '../../app/page';
import { truncate2 } from '../../hooks/usePriceCalculation';
import CartItemCard from './CartItemCard';

interface CartPanelProps {
  cartItems: StockItem[];
  currentUser: LoggedInUser | null;
  cartPrices: Record<string, number>;
  subTotal: number;
  kdvRate: number;
  kdvAmount: number;
  displayTotal: number;
  onRemoveFromCart: (id: string) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onClearCart: () => void;
  getItemPrice: (item: StockItem, quantity?: number) => Promise<number>;
  onSetCartItems: (items: StockItem[]) => void;
}

export default function CartPanel({
  cartItems,
  currentUser,
  cartPrices,
  subTotal,
  kdvRate,
  kdvAmount,
  displayTotal,
  onRemoveFromCart,
  onUpdateQuantity,
  onClearCart,
  getItemPrice,
  onSetCartItems,
}: CartPanelProps) {
  const toast = useToast();

  const createOrder = async () => {
    if (!currentUser) return;
    if (cartItems.length === 0) return;

    const insufficientStockItems = cartItems.filter(
      item => item.availableStock < (item.quantity || 1),
    );

    if (insufficientStockItems.length > 0) {
      const warningMessage = insufficientStockItems
        .map(
          item =>
            `• ${item.code}: Mevcut ${item.availableStock} adet, Rezerve ${item.reservedStock} adet, Sipariş ${item.quantity} adet`,
        )
        .join('\n');

      const proceed = confirm(
        `ℹ️ Stok Bilgisi\n\n` +
        `Aşağıdaki ürünlerde stok yetersizliği var:\n\n` +
        `${warningMessage}\n\n` +
        `Bu ürünler rezerve edilecek ve üretim planına alınacak. Sipariş vermek istiyor musunuz?`,
      );

      if (!proceed) return;
    }

    try {
      const orderItems = await Promise.all(
        cartItems.map(async item => {
          if (item.isPackage && item.packageId) {
            return {
              packageId: item.packageId,
              productId: null,
              quantity: item.quantity || 1,
              unitPrice: item.price || 0,
              isPackage: true,
            };
          }

          const totalPrice = await getItemPrice(item, item.quantity || 1);
          return {
            productId: item.id,
            packageId: null,
            quantity: item.quantity || 1,
            unitPrice: totalPrice,
            filamentType: item.filaments?.[0]?.type || 'PLA',
            isPackage: false,
          };
        }),
      );

      const orderSubtotal = truncate2(
        orderItems.reduce(
          (total, item) => total + (item.unitPrice || 0) * (item.quantity || 1),
          0,
        ),
      );

      const kdvAmountLocal = truncate2(orderSubtotal * (kdvRate / 100));
      const totalAmount = truncate2(orderSubtotal + kdvAmountLocal);

      const orderData = {
        customerId: currentUser?.id || 1,
        products: orderItems,
        orderType: 'normal',
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API hatası: ${response.status} ${response.statusText}\nDetay: ${errorText}`,
        );
      }

      const newOrder = await response.json();
      toast.success(
        `Sipariş oluşturuldu! Sipariş no: ${newOrder.orderCode || newOrder.id} - Toplam: ${totalAmount}₺`,
      );
      onSetCartItems([]);
    } catch (err) {
      console.error('Sipariş oluşturulurken hata:', err);
      toast.error('Sipariş oluşturulurken bir hata oluştu!');
    }
  };

  if (currentUser?.type !== 'customer') return null;

  return (
    <div className="w-full lg:w-[400px] lg:border-l border-border">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Sepet</h2>
          {cartItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Sepeti Temizle
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Icons.ShoppingCartIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Sepetiniz boş</h3>
            <p className="text-sm text-gray-500">
              Ürünleri sepete ekleyerek sipariş oluşturabilirsiniz
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {cartItems.map((item, index) => (
                <CartItemCard
                  key={index}
                  item={item}
                  index={index}
                  currentUser={currentUser}
                  cartPrices={cartPrices}
                  onRemove={onRemoveFromCart}
                  onUpdateQuantity={onUpdateQuantity}
                />
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ara Toplam:</span>
                <span className="font-medium">{subTotal.toFixed(2)}₺</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">KDV (%{kdvRate}):</span>
                <span className="font-medium">{kdvAmount.toFixed(2)}₺</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                <span>Toplam:</span>
                <span className="text-blue-600">{displayTotal.toFixed(2)}₺</span>
              </div>
            </div>

            <button
              onClick={createOrder}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-lg"
            >
              <Icons.ShoppingCartIcon className="w-6 h-6" />
              SİPARİŞ OLUŞTUR
            </button>
          </>
        )}
      </div>
    </div>
  );
}

