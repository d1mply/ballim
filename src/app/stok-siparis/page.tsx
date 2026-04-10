'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import { LoggedInUser } from '../page';
import { useToast } from '../../contexts/ToastContext';
import { useCart, StockItem } from '../../hooks/useCart';
import { usePriceCalculation } from '../../hooks/usePriceCalculation';
import ProductListSection from '../../components/stok-siparis/ProductListSection';
import CartPanel from '../../components/stok-siparis/CartPanel';
import PackageListSection from '../../components/stok-siparis/PackageListSection';

export default function StokSiparisPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [products, setProducts] = useState<StockItem[]>([]);
  const [kdvRate] = useState(20);
  const [activeTab, setActiveTab] = useState<'products' | 'packages'>('products');
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

  const { cartItems, setCartItems, addToCart, removeFromCart, updateQuantity, addPackageToCart, clearCart } =
    useCart({ currentUser });

  const { cartPrices, getItemPrice, subTotal, kdvAmount, displayTotal } =
    usePriceCalculation({ cartItems, currentUser, kdvRate });

  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      setCurrentUser(JSON.parse(loggedUserJson));
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'packages') {
      fetchPackages();
    }
  }, [activeTab]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?all=true');
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const stockItems: StockItem[] = data.map((product: any) => {
        const availableStock = product.availableStock || 0;
        const reservedStock = product.reservedStock || 0;
        const totalStock = product.totalStock || 0;
        const stockDisplay = product.stockDisplay || 'Stokta Yok';

        return {
          ...product,
          stockAmount: availableStock,
          availableStock,
          reservedStock,
          totalStock,
          stockDisplay,
          stockStatus:
            availableStock > 0
              ? 'Stokta var'
              : reservedStock > 0
                ? 'Rezerve'
                : 'Stokta yok',
        } as StockItem;
      });

      setProducts(stockItems);
    } catch (error) {
      console.error('Ürünleri getirme hatası:', error);
      toast.error('Ürünler yüklenirken bir hata oluştu!');
    }
  };

  const fetchPackages = async () => {
    try {
      setIsLoadingPackages(true);
      const response = await fetch('/api/packages?includeItems=true');
      if (!response.ok) throw new Error('Paketler yüklenemedi');
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      console.error('Paketleri yükleme hatası:', error);
      setPackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const handleAddPackageToCart = (pkg: any) => {
    addPackageToCart(pkg);
    toast.success(`${pkg.name} sepete eklendi!`);
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold">Stok ve Sipariş</h1>
            <div className="flex gap-2">
              <div className="flex gap-2 bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'products'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Ürünler
                </button>
                <button
                  onClick={() => setActiveTab('packages')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'packages'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Paketler
                </button>
              </div>
              <button
                onClick={() => {
                  if (activeTab === 'products') {
                    fetchProducts();
                  } else {
                    fetchPackages();
                  }
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors w-full sm:w-auto"
              >
                <Icons.RefreshIcon className="w-4 h-4" />
                Yenile
              </button>
            </div>
          </div>

          {activeTab === 'products' ? (
            <ProductListSection
              products={products}
              currentUser={currentUser}
              onAddToCart={addToCart}
            />
          ) : (
            <PackageListSection
              packages={packages}
              isLoadingPackages={isLoadingPackages}
              currentUser={currentUser}
              onAddPackageToCart={handleAddPackageToCart}
            />
          )}
        </div>

        <CartPanel
          cartItems={cartItems}
          currentUser={currentUser}
          cartPrices={cartPrices}
          subTotal={subTotal}
          kdvRate={kdvRate}
          kdvAmount={kdvAmount}
          displayTotal={displayTotal}
          onRemoveFromCart={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onClearCart={clearCart}
          getItemPrice={getItemPrice}
          onSetCartItems={setCartItems}
        />
      </div>
    </Layout>
  );
}
