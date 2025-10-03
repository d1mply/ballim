'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';
import { ProductData } from '../../components/ProductModal';
import { LoggedInUser } from '../page';


// Stock item tipini tanımla
interface StockItem extends ProductData {
  stockAmount: number;
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  stockDisplay: string;
  stockStatus: string;
}

export default function StokSiparisPage() {
  // 2 ondalık basamakta kesme (yuvarlamasız)
  const truncate2 = (value: number) => {
    if (!isFinite(value)) return 0;
    return Math.trunc(value * 100) / 100;
  };
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [products, setProducts] = useState<StockItem[]>([]);
  const [cartItems, setCartItems] = useState<StockItem[]>([]);
  const [cartPrices, setCartPrices] = useState<{[key: string]: number}>({});
  const [kdvRate, setKdvRate] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('Tüm Ürünler');
  const [productTypes, setProductTypes] = useState<string[]>([]);


  
  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      setCurrentUser(JSON.parse(loggedUserJson));
    }
  }, []);

  // API'den ürün verilerini al
  useEffect(() => {
    fetchProducts();
  }, []);

  // Her 5 saniyede bir stok verilerini yenile (otomatik güncelleme)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts();
    }, 5000); // 5 saniye

    return () => clearInterval(interval);
  }, []);

  // Sepet fiyatlarını hesapla
  useEffect(() => {
    const calculateCartPrices = async () => {
      if (!currentUser || cartItems.length === 0) {
        return;
      }

      const newPrices: {[key: string]: number} = {};
      
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

  const fetchProducts = async () => {
    try {
      // Ürünleri API'den al
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      }
      
      const products = await response.json();
      
      // Stok bilgilerini ekle - rezerve stok sistemi ile
      const stockItemsWithAmount = products.map((product: any) => {
        const availableStock = product.availableStock || 0;
        const reservedStock = product.reservedStock || 0;
        const totalStock = product.totalStock || 0;
        const stockDisplay = product.stockDisplay || 'Stokta Yok';
        
        return {
          ...product,
          stockAmount: availableStock, // Geriye uyumluluk için
          availableStock,
          reservedStock,
          totalStock,
          stockDisplay,
          stockStatus: availableStock > 0 ? 'Stokta var' : reservedStock > 0 ? 'Rezerve' : 'Stokta yok'
        } as StockItem;
      });
      
      setProducts(stockItemsWithAmount);
      setProductTypes(Array.from(new Set(stockItemsWithAmount.map((p: StockItem) => p.productType))));
    } catch (error) {
      console.error('Ürünleri getirme hatası:', error);
      alert('Ürünler yüklenirken bir hata oluştu!');
    }
  };

  
  // Arama ve filtreleme
  const filteredProducts = products.filter((item) => {
    try {
      const searchMatch = (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) || 
                         (item.productType && item.productType.toLowerCase().includes(searchQuery.toLowerCase()));
      const filterMatch = selectedType === 'Tüm Ürünler' || 
                         (selectedType === 'Stokta Var' && item.stockAmount > 0) ||
                         (selectedType === 'Stokta Yok' && item.stockAmount === 0);
      return searchMatch && filterMatch;
    } catch (error) {
      console.error('Stok ürün filtreleme hatası:', error, item);
      return false;
    }
  });
  
  // Stok durumu kontrolü - rezerve stok sistemi ile
  const getStockStatus = (availableStock: number, reservedStock: number, orderedAmount: number) => {
    if (availableStock > 0) {
      return { 
        status: `Stok ${availableStock} (${reservedStock} rezerve)`, 
        color: 'text-green-600', 
        bgColor: 'bg-green-50' 
      };
    } else if (reservedStock > 0) {
      return { 
        status: `Stok 0 (${reservedStock} rezerve)`, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50' 
      };
    } else {
      return { 
        status: 'Stokta Yok', 
        color: 'text-red-600', 
        bgColor: 'bg-red-50' 
      };
    }
  };

  // Sepete ürün ekleme
  const addToCart = (item: StockItem) => {
    // Sadece müşteri hesapları için sepete ekleme yapılabilir
    if (currentUser?.type !== 'customer') return;

    // Stok yetersizliği kontrolü - rezerve stok sistemi ile
    const orderedQuantity = 1; // Varsayılan miktar
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
  
  // Sepetten ürün çıkarma
  const removeFromCart = (id: string) => {
    // Sadece müşteri hesapları için sepetten çıkarma yapılabilir
    if (currentUser?.type !== 'customer') return;

    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };
  
  // Ürün miktarını güncelleme
  const updateQuantity = async (index: number, newQuantity: number) => {
    // Sadece müşteri hesapları için miktar güncellenebilir
    if (currentUser?.type !== 'customer') return;

    if (newQuantity < 1) return;
    
    // Stok yetersizliği kontrolü - rezerve stok sistemi ile
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

  
  // Ürün fiyatını hesapla (normal müşteri vs toptancı)
  const getItemPrice = async (item: StockItem, quantity: number = 1) => {
    // Varsayılan fiyat - eğer fiyat hesaplama başarısız olursa
    const defaultPrice = 10; // Varsayılan fiyat

    if (currentUser?.type !== 'customer') {
      return defaultPrice;
    }

    const requestData = {
      customerId: currentUser.id,
      productId: item.id,
      quantity: quantity,
      filamentType: item.filaments?.[0]?.type || 'PLA'
    };

    try {
      const response = await fetch('/api/calculate-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const priceData = await response.json();
        return priceData.totalPrice || defaultPrice;
      } else {
        const errorText = await response.text();
        console.error('API hatası:', response.status, errorText);
        return defaultPrice;
      }
    } catch (error) {
      console.error('Fiyat hesaplama hatası:', error);
      return defaultPrice;
    }
  };

  // Ürünün filament fiyatını bul (eski sistem - normal müşteriler için)
  const getFilamentPrice = (item: StockItem) => {
    // Eğer müşteri oturumu açmışsa
    if (currentUser?.type === 'customer' && currentUser?.filamentPrices) {
      // Ürünün filament tipini bul
      const filamentType = item.filaments?.[0]?.type;
      if (filamentType) {
        // Müşterinin o filament tipi için özel fiyatını bul
        const customerPrice = currentUser.filamentPrices.find(
          fp => fp.type.toLowerCase() === filamentType.toLowerCase()
        );
        if (customerPrice) {
          return customerPrice.price;
        }
      }
    }
    
    // Varsayılan fiyat (örn: gram başına 50₺/50 = 1₺)
    return 1;
  };
  
  // Sipariş oluşturma
  const createOrder = async () => {
    // Admin de sipariş oluşturabilir (stok üretimi için)
    if (!currentUser) return;

    console.log('🚀 createOrder fonksiyonu başladı');
    if (cartItems.length === 0) return;
    
    // Genel stok kontrolü - rezerve stok sistemi ile
    const insufficientStockItems = cartItems.filter(item => 
      item.availableStock < (item.quantity || 1)
    );
    
    if (insufficientStockItems.length > 0) {
      const warningMessage = insufficientStockItems.map(item => 
        `• ${item.code}: Mevcut ${item.availableStock} adet, Rezerve ${item.reservedStock} adet, Sipariş ${item.quantity} adet`
      ).join('\n');
      
      const proceed = confirm(
        `ℹ️ Stok Bilgisi\n\n` +
        `Aşağıdaki ürünlerde stok yetersizliği var:\n\n` +
        `${warningMessage}\n\n` +
        `Bu ürünler rezerve edilecek ve üretim planına alınacak. Sipariş vermek istiyor musunuz?`
      );
      
      if (!proceed) return;
    }
    
    try {
      // Sipariş ürünlerini hazırla
      const orderItems = await Promise.all(cartItems.map(async (item) => {
        const totalPrice = await getItemPrice(item, item.quantity || 1);
        return {
          productId: item.id,
          quantity: item.quantity || 1,
          unitPrice: totalPrice,
          filamentType: item.filaments?.[0]?.type || 'PLA'
        };
      }));
      
      console.log('📦 Sipariş ürünleri hazırlandı:', orderItems);
      
      // Toplam tutarı hesapla (orderItems'dan al)
      const subtotal = truncate2(
        orderItems.reduce((total, item) => {
          return total + (item.unitPrice || 0);
        }, 0)
      );
      
      // KDV dahil fiyattan sipariş oluştur
      const kdvAmountLocal = truncate2(subtotal * (kdvRate / 100));
      const totalAmount = truncate2(subtotal + kdvAmountLocal);
      
      const orderData = {
        customerId: currentUser?.id || 1, // Varsayılan müşteri ID
        products: orderItems, // API'de 'products' bekleniyor
        orderType: 'normal'
      };

      console.log('📋 Gönderilen sipariş verisi:', orderData);
      console.log('🌐 API çağrısı yapılıyor...');
      
      // Veritabanına sipariş oluştur
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      console.log('📥 API yanıtı alındı, status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Yanıt Detayları:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`API hatası: ${response.status} ${response.statusText}\nDetay: ${errorText}`);
      }
      
      const newOrder = await response.json();
      
      // Stok güncellemelerini kaldırıyoruz çünkü artık üretim takip sayfasında yapılacak
      alert(`Sipariş oluşturuldu! Sipariş no: ${newOrder.orderCode || newOrder.id}\nToplam Tutar: ${totalAmount}₺\nSipariş takip sayfasından kontrol edebilirsiniz.`);
      setCartItems([]);
    } catch (error) {
      console.error('Sipariş oluşturulurken hata:', error);
      alert('Sipariş oluşturulurken bir hata oluştu! Detaylar için konsolu kontrol edin.');
    }
  };
  
  // Ara toplam hesaplama
  const subTotal = truncate2(
    cartItems.reduce((total, item) => {
      const key = `${item.id}-${item.quantity}`;
      const itemTotal = cartPrices[key] || 0;
      return total + itemTotal;
    }, 0)
  );
  
  // KDV hariç toplam tutarı hesaplama
  const kdvAmount = truncate2(subTotal * (kdvRate / 100));
  const displayTotal = truncate2(subTotal + kdvAmount);
  
  
  return (
    <Layout>
      <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-6">
        {/* Sol taraf - Ürün listesi */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold">Stok ve Sipariş</h1>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 py-2 px-3 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors w-full sm:w-auto"
            >
              <Icons.RefreshIcon className="w-4 h-4" />
              Yenile
            </button>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div className="search-container">
              <Icons.SearchIcon className="search-icon" />
              <input
                type="text"
                placeholder="Ürün kodu veya türü ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
            >
              <option>Tüm Ürünler</option>
              {productTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Desktop Tablo */}
          <div className="hidden lg:block bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="py-3 px-4 font-medium">Ürün</th>
                  <th className="py-3 px-4 font-medium">Tip</th>
                  <th className="py-3 px-4 font-medium">Boyut</th>
                  <th className="py-3 px-4 font-medium">Kapasite</th>
                  <th className="py-3 px-4 font-medium">Stok Durumu</th>
                  {currentUser?.type === 'customer' && (
                    <th className="py-3 px-4 font-medium"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((item) => (
                    <tr key={item.id} className="border-t border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt={item.productType} className="w-12 h-12 rounded-md object-cover bg-muted" />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                              <Icons.PackageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{item.code}</div>
                            <div className="text-sm text-muted-foreground">{item.productType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{item.filaments?.[0]?.type || '-'}</td>
                      <td className="py-3 px-4">{item.dimensionX}x{item.dimensionY}x{item.dimensionZ} mm</td>
                      <td className="py-3 px-4">{item.capacity} adet</td>
                      <td className="py-3 px-4">
                        {(() => {
                          const stockStatus = getStockStatus(item.availableStock, item.reservedStock, 1);
                          return (
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
                              <div className={`w-2 h-2 rounded-full ${
                                item.availableStock > 0 ? 'bg-green-500' : item.reservedStock > 0 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              {stockStatus.status}
                            </div>
                          );
                        })()}
                      </td>
                      {currentUser?.type === 'customer' && (
                        <td className="py-3 px-4">
                          <button
                            onClick={() => addToCart(item)}
                            className="flex items-center gap-1.5 py-1.5 px-3 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                          >
                            <Icons.ShoppingCartIcon className="w-4 h-4" />
                            Sepete Ekle
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={currentUser?.type === 'customer' ? 6 : 5} className="py-8 text-center text-muted-foreground">
                      Ürün bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="block lg:hidden space-y-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((item) => (
                <div key={item.id} className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {item.image ? (
                      <img src={item.image} alt={item.productType} className="w-16 h-16 rounded-md object-cover bg-muted flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Icons.PackageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-lg mb-1">{item.code}</div>
                      <div className="text-sm text-muted-foreground mb-2">{item.productType}</div>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Filament:</span> {item.filaments?.[0]?.type || '-'}</div>
                        <div><span className="font-medium">Boyut:</span> {item.dimensionX}x{item.dimensionY}x{item.dimensionZ} mm</div>
                        <div><span className="font-medium">Kapasite:</span> {item.capacity} adet</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {(() => {
                      const stockStatus = getStockStatus(item.availableStock, item.reservedStock, 1);
                      return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
                            <div className={`w-2 h-2 rounded-full ${
                              item.availableStock > 0 ? 'bg-green-500' : item.reservedStock > 0 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                          {stockStatus.status}
                        </div>
                      );
                    })()}
                    
                    {currentUser?.type === 'customer' && (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex items-center gap-1.5 py-2 px-4 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                      >
                        <Icons.ShoppingCartIcon className="w-4 h-4" />
                        Sepete Ekle
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
                Ürün bulunamadı.
              </div>
            )}
          </div>
        </div>

        {/* Sağ taraf - Sepet (sadece müşteri hesapları için) */}
        {currentUser?.type === 'customer' && (
          <div className="w-full lg:w-[400px] lg:border-l border-border">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Sepet</h2>
                {cartItems.length > 0 && (
                  <button 
                    onClick={() => setCartItems([])}
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
                  <p className="text-sm text-gray-500">Ürünleri sepete ekleyerek sipariş oluşturabilirsiniz</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cartItems.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          {/* Ürün Görseli */}
                          <div className="flex-shrink-0">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.productType} 
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Icons.PackageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Ürün Bilgileri */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{item.code}</h4>
                            <p className="text-sm text-gray-500 mb-2">{item.productType}</p>

                            {/* Stok Durumu */}
                            {(() => {
                              const stockStatus = getStockStatus(item.availableStock, item.reservedStock, item.quantity || 1);
                              return (
                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium mb-2 ${stockStatus.bgColor} ${stockStatus.color}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    item.availableStock > 0 ? 'bg-green-500' : item.reservedStock > 0 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></div>
                                  {stockStatus.status}
                                </div>
                              );
                            })()}

                            <p className="text-sm font-medium text-blue-600">
                              {(() => {
                                const key = `${item.id}-${item.quantity}`;
                                const totalPrice = cartPrices[key] || 0;
                                const quantity = item.quantity || 1;
                                const pricePerPiece = totalPrice > 0 ? (totalPrice / quantity).toFixed(2) : '0.00';
                                return `${pricePerPiece}₺ / adet`;
                              })()}
                            </p>
                            
                            {/* Filament bilgisi göster */}
                            {currentUser?.customerCategory === 'normal' && (
                              <p className="text-xs text-gray-500">
                                {(() => {
                                  const filamentType = item.filaments?.[0]?.type || 'PLA';
                                  const filamentPrice = currentUser?.filamentPrices?.find(fp => fp.type === filamentType);
                                  if (filamentPrice) {
                                    return `${filamentType} ${filamentPrice.price}₺/gr`;
                                  }
                                  return `${filamentType} 8₺/gr (varsayılan)`;
                                })()}
                              </p>
                            )}
                          </div>
                          
                          {/* Sil Butonu */}
                          <button
                            onClick={() => removeFromCart(item.id || '')}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sepetten Çıkar"
                          >
                            <Icons.TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {/* Miktar Kontrolleri */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">Miktar:</span>
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() => updateQuantity(index, Math.max(1, (item.quantity || 1) - 1))}
                                className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                                disabled={(item.quantity || 1) <= 1}
                              >
                                <Icons.MinusIcon className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || 1}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  updateQuantity(index, newQuantity);
                                }}
                                className="w-16 px-2 py-2 bg-white font-medium text-center border-0 focus:outline-none focus:bg-blue-50 focus:ring-2 focus:ring-blue-300 rounded"
                              />
                              <button
                                onClick={() => updateQuantity(index, (item.quantity || 1) + 1)}
                                className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                              >
                                <Icons.PlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Toplam Fiyat */}
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {(() => {
                                const key = `${item.id}-${item.quantity}`;
                                const totalPrice = cartPrices[key] || 0;
                                return `${totalPrice.toFixed(2)}₺`;
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Fiyat Hesaplaması */}
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
                  
                  {/* Sipariş Butonu */}
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
        )}
      </div>
    </Layout>
  );
}