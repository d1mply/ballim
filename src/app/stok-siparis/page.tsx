'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { SearchIcon, RefreshIcon } from '@/utils/Icons';
import { ProductData } from '@/components/ProductModal';
import { LoggedInUser } from '../page';
import { ShoppingCartIcon, PackageIcon, MinusIcon, PlusIcon, TrashIcon } from '@/utils/Icons';

// Stock item tipini tanımla
interface StockItem extends ProductData {
  stockAmount: number;
  stockStatus: string;
}

export default function StokSiparisPage() {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [products, setProducts] = useState<StockItem[]>([]);
  const [cartItems, setCartItems] = useState<StockItem[]>([]);
  const [kdvRate, setKdvRate] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('Tüm Ürünler');
  const [productTypes, setProductTypes] = useState<string[]>([]);

  const router = useRouter();
  
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

  const fetchProducts = async () => {
    try {
      // Ürünleri API'den al
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      }
      
      const products = await response.json();
      
      // Stok bilgilerini ekle
      const stockItemsWithAmount = products.map((product: ProductData) => {
        // Stok bilgisi API'den geliyorsa doğrudan kullan
        const stockAmount = product.stockQuantity || 0;
        return {
          ...product,
          stockAmount,
          stockStatus: stockAmount > 0 ? 'Stokta var' : 'Stokta yok'
        } as StockItem;
      });
      
      setProducts(stockItemsWithAmount);
      setProductTypes(Array.from(new Set(stockItemsWithAmount.map((p: StockItem) => p.productType))));
    } catch (error) {
      console.error('Ürünleri getirme hatası:', error);
      alert('Ürünler yüklenirken bir hata oluştu!');
    }
  };
  
  // Filament tiplerini API'den al
  const getFilamentTypes = async () => {
    try {
      // Filament tiplerini API'den al
      const response = await fetch('/api/filaments');
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      }
      
      const filaments = await response.json();
      
      // Benzersiz filament tiplerini döndür
      const uniqueTypes = Array.from(new Set(filaments.map((f: any) => f.type)));
      return uniqueTypes.length > 0 ? uniqueTypes : ['PLA', 'PETG', 'ABS', 'TPU'];
    } catch (error) {
      console.error('Filament tiplerini yüklerken hata:', error);
      return ['PLA', 'PETG', 'ABS', 'TPU']; // Hata durumunda varsayılan tipler
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
  
  // Sepete ürün ekleme
  const addToCart = (item: StockItem) => {
    // Sadece müşteri hesapları için sepete ekleme yapılabilir
    if (currentUser?.type !== 'customer') return;

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
  const updateQuantity = (index: number, newQuantity: number) => {
    // Sadece müşteri hesapları için miktar güncellenebilir
    if (currentUser?.type !== 'customer') return;

    if (newQuantity < 1) return;
    setCartItems(prevItems => 
      prevItems.map((item, i) => 
        i === index 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };
  
  // Stok durumu gösterimi için stil belirleme
  const getStockStatusStyle = (status: string, amount: number) => {
    if (amount > 5) {
      return "bg-success text-white font-medium px-3 py-1.5 rounded-md text-sm";
    } else if (amount > 0) {
      return "bg-warning text-white font-medium px-3 py-1.5 rounded-md text-sm";
    } else {
      return "bg-danger text-white font-medium px-3 py-1.5 rounded-md text-sm";
    }
  };
  
  // Ürünün filament fiyatını bul
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
    // Sadece müşteri hesapları için sipariş oluşturulabilir
    if (currentUser?.type !== 'customer') return;

    console.log('🚀 createOrder fonksiyonu başladı');
    if (cartItems.length === 0) return;
    
    try {
      // Sipariş ürünlerini hazırla
      const orderItems = cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity || 1,
        unitPrice: Math.round(item.pieceGram * getFilamentPrice(item))
      }));
      
      console.log('📦 Sipariş ürünleri hazırlandı:', orderItems);
      
      // Toplam tutarı hesapla
      const subtotal = cartItems.reduce((total, item) => {
        const filamentPrice = getFilamentPrice(item);
        if (item.pieceGram && filamentPrice) {
          const itemPrice = Math.round(item.pieceGram * filamentPrice);
          return total + (itemPrice * (item.quantity || 1));
        }
        return total;
      }, 0);
      
      // KDV dahil fiyattan sipariş oluştur
      const totalAmount = Math.round(subtotal * (1 + kdvRate / 100));
      
      const orderData = {
        customerId: currentUser?.type === 'customer' ? currentUser.id : null,
        totalAmount,
        status: 'Onay Bekliyor',
        paymentStatus: 'Ödeme Bekliyor',
        notes: '',
        items: orderItems
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
  const subTotal = cartItems.reduce((total, item) => {
    const filamentPrice = getFilamentPrice(item);
    if (item.pieceGram && filamentPrice) {
      const itemPrice = Math.round(item.pieceGram * filamentPrice);
      return total + (itemPrice * (item.quantity || 1));
    }
    return total;
  }, 0);
  
  // KDV hariç toplam tutarı hesaplama
  const displayTotal = Math.round(subTotal * (1 + kdvRate / 100));
  
  // KDV tutarını hesaplama
  const kdvAmount = Math.round(subTotal * kdvRate / 100);
  
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
              <RefreshIcon className="w-4 h-4" />
              Yenile
            </button>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div className="search-container">
              <SearchIcon className="search-icon" />
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
                              <PackageIcon className="w-6 h-6 text-muted-foreground" />
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
                        <span className={`inline-flex items-center gap-1.5 ${
                          item.stockAmount > 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {item.stockAmount > 0 ? 'Stokta var' : 'Stokta yok'}
                          <span className="font-medium">({item.stockAmount} adet)</span>
                        </span>
                      </td>
                      {currentUser?.type === 'customer' && (
                        <td className="py-3 px-4">
                          <button
                            onClick={() => addToCart(item)}
                            className="flex items-center gap-1.5 py-1.5 px-3 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                          >
                            <ShoppingCartIcon className="w-4 h-4" />
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
                        <PackageIcon className="w-8 h-8 text-muted-foreground" />
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
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                      item.stockAmount > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {item.stockAmount > 0 ? 'Stokta var' : 'Stokta yok'}
                      <span>({item.stockAmount} adet)</span>
                    </span>
                    
                    {currentUser?.type === 'customer' && (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex items-center gap-1.5 py-2 px-4 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                      >
                        <ShoppingCartIcon className="w-4 h-4" />
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
                    <ShoppingCartIcon className="w-8 h-8 text-gray-400" />
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
                                <PackageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Ürün Bilgileri */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{item.code}</h4>
                            <p className="text-sm text-gray-500 mb-2">{item.productType}</p>
                            {/* Debug için gram bilgisini göster */}
                            <p className="text-xs text-gray-400 mb-1">
                              Gramaj: {item.pieceGram}g | Fiyat: {getFilamentPrice(item)}₺/g
                            </p>
                            <p className="text-sm font-medium text-blue-600">
                              {item.pieceGram && getFilamentPrice(item) ? 
                                Math.round(item.pieceGram * getFilamentPrice(item)) : 0}₺ / adet
                            </p>
                          </div>
                          
                          {/* Sil Butonu */}
                          <button
                            onClick={() => removeFromCart(item.id || '')}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sepetten Çıkar"
                          >
                            <TrashIcon className="w-5 h-5" />
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
                                <MinusIcon className="w-4 h-4" />
                              </button>
                              <span className="px-4 py-2 bg-white font-medium min-w-[60px] text-center">
                                {item.quantity || 1}
                              </span>
                              <button
                                onClick={() => updateQuantity(index, (item.quantity || 1) + 1)}
                                className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                              >
                                <PlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Toplam Fiyat */}
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {item.pieceGram && getFilamentPrice(item) ? 
                                Math.round(item.pieceGram * getFilamentPrice(item) * (item.quantity || 1)) : 0}₺
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
                      <span className="font-medium">{subTotal}₺</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">KDV (%{kdvRate}):</span>
                      <span className="font-medium">{kdvAmount}₺</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                      <span>Toplam:</span>
                      <span className="text-blue-600">{displayTotal}₺</span>
                    </div>
                  </div>
                  
                  {/* Sipariş Butonu */}
                  <button 
                    onClick={createOrder}
                    className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-lg"
                  >
                    <ShoppingCartIcon className="w-6 h-6" />
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