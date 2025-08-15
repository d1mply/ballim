'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';

// Ürün tipi
interface Product {
  id: string;
  code: string;
  productType: string;
  capacity: number;
  totalGram: number;
  pieceGram: number;
  stockQuantity: number;
  filaments: {
    type: string;
    color: string;
    brand: string;
    weight: number;
  }[];
}

// LoggedInUser tipi
interface LoggedInUser {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

// Stok üretim emri formu tipi
interface StockProductionForm {
  productId: string;
  quantity: number;
  reason: string;
  notes: string;
  productionDate: string;
}

export default function StokUretimEmriPage() {
  const router = useRouter();
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<StockProductionForm>({
    productId: '',
    quantity: 1,
    reason: 'Stok',
    notes: '',
    productionDate: new Date().toISOString().split('T')[0]
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFilamentModal, setShowFilamentModal] = useState(false);

  // Kullanıcı kontrolü
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as LoggedInUser;
        setUser(userData);
        
        if (userData.type !== 'admin') {
          router.push('/');
        }
      } catch (error) {
        console.error('Kullanıcı bilgisi yüklenirken hata:', error);
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  // Ürünleri yükle
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error('Ürünler yüklenemedi');
        }
        
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
        alert('Ürünler yüklenirken bir hata oluştu!');
      } finally {
        setLoading(false);
      }
    };

    if (user?.type === 'admin') {
      fetchProducts();
    }
  }, [user]);

  // Ürün seçimi değiştiğinde
  useEffect(() => {
    if (formData.productId) {
      // ID'yi hem string hem number olarak karşılaştır
      const product = products.find(p => p.id === formData.productId || p.id === parseInt(formData.productId));
      console.log('Ürün seçimi değişti:', { 
        productId: formData.productId, 
        productIdType: typeof formData.productId,
        product, 
        products: products.map(p => ({id: p.id, idType: typeof p.id, code: p.code}))
      });
      setSelectedProduct(product || null);
    } else {
      setSelectedProduct(null);
    }
  }, [formData.productId, products]);

  // Form input değişiklikleri
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    }));
  };

  // Filament hesaplama
  const calculateFilamentUsage = () => {
    if (!selectedProduct || !formData.quantity) return [];
    
    return selectedProduct.filaments.map(filament => ({
      ...filament,
      totalWeight: (filament.weight * formData.quantity).toFixed(2)
    }));
  };

  // Toplam maliyet hesaplama (basit versiyon)
  const calculateTotalCost = () => {
    if (!selectedProduct || !formData.quantity) return 0;
    
    const totalGram = selectedProduct.totalGram * formData.quantity;
    // Gram başına ortalama 0.05 TL (bu değer dinamik olmalı)
    return (totalGram * 0.05).toFixed(2);
  };

  // Form gönderimi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form gönderimi başlıyor:', { selectedProduct, formData });

    if (!selectedProduct) {
      alert('Lütfen bir ürün seçin!');
      return;
    }

    if (!selectedProduct.id) {
      alert('Ürün bilgileri eksik veya hatalı');
      console.error('Seçili ürün ID\'si eksik:', selectedProduct);
      return;
    }

    if (formData.quantity <= 0) {
      alert('Miktar 0\'dan büyük olmalıdır!');
      return;
    }

    setSubmitting(true);

    try {
      // Stok üretim emri için özel sipariş oluştur
      const orderData = {
        customerId: null, // Stok için müşteri yok
        customerName: `Stok Üretimi (${formData.reason})`,
        orderDate: formData.productionDate,
        status: 'Onay Bekliyor',
        paymentStatus: 'Tamamlandı', // Stok üretimi için ödeme durumu
        notes: `STOK ÜRETİM EMRİ\nSebep: ${formData.reason}\nNot: ${formData.notes}`,
        items: [{
          productId: selectedProduct.id,
          quantity: formData.quantity,
          unitPrice: 0.01 // API 0'ı kabul etmiyor, 0.01 gönder
        }],
        totalAmount: 0,
        isMarketplaceOrder: false,
        isStockOrder: true // Stok siparişi olduğunu belirt
      };

      console.log('🚀 Stok üretim emri oluşturuluyor:', orderData);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API Hatası:', { 
          status: response.status, 
          statusText: response.statusText, 
          result 
        });
        throw new Error(result.error || 'Stok üretim emri oluşturulamadı');
      }

      alert('Stok üretim emri başarıyla oluşturuldu! Üretim takip sayfasından işlemi takip edebilirsiniz.');
      
      // Formu sıfırla
      setFormData({
        productId: '',
        quantity: 1,
        reason: 'Stok',
        notes: '',
        productionDate: new Date().toISOString().split('T')[0]
      });

      // Üretim takip sayfasına yönlendir
      router.push('/uretim-takip');

    } catch (error) {
      console.error('Stok üretim emri hatası:', error);
      alert('Stok üretim emri oluşturulurken bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (user?.type !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Icons.ClipboardIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Yetkisiz Erişim</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Stok Üretim Emri</h1>
            <Icons.CubeIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Ürün Seçimi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="productId" className="block text-sm font-medium mb-2">
                  Ürün Seçin *
                </label>
                <select
                  id="productId"
                  name="productId"
                  value={formData.productId}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ürün seçin...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.productType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-2">
                  Üretim Miktarı *
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Sebep ve Tarih */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-2">
                  Üretim Sebebi *
                </label>
                <select
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Stok">Stok Tamamlama</option>
                  <option value="Pazarlama">Pazarlama</option>
                  <option value="Sergi">Sergi/Fuar</option>
                  <option value="Demo">Demo/Örnek</option>
                  <option value="Yedek">Yedek Stok</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div>
                <label htmlFor="productionDate" className="block text-sm font-medium mb-2">
                  Üretim Tarihi *
                </label>
                <input
                  type="date"
                  id="productionDate"
                  name="productionDate"
                  value={formData.productionDate}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notlar */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-2">
                Notlar
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Ek notlar..."
                className="w-full border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Seçili Ürün Detayları */}
            {selectedProduct && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Üretim Detayları</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Ürün Kodu</div>
                    <div className="font-semibold">{selectedProduct.code}</div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Mevcut Stok</div>
                    <div className="font-semibold">{selectedProduct.stockQuantity} adet</div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Kapasitesi</div>
                    <div className="font-semibold">{selectedProduct.capacity} adet/tabla</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Toplam Ağırlık</div>
                    <div className="font-semibold">{(selectedProduct.totalGram * formData.quantity).toFixed(2)} gram</div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Tahmini Maliyet</div>
                    <div className="font-semibold">{calculateTotalCost()} ₺</div>
                  </div>
                </div>

                {/* Filament Detayları */}
                {selectedProduct.filaments && selectedProduct.filaments.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Filament Kullanımı</h4>
                      <button
                        type="button"
                        onClick={() => setShowFilamentModal(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Detayları Görüntüle
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedProduct.filaments.length} farklı filament türü kullanılacak
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Butonları */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedProduct}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
                onClick={() => console.log('Buton tıklandı:', { submitting, selectedProduct, formData })}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Icons.PlusIcon className="w-5 h-5 mr-2" />
                    Üretim Emri Oluştur
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Filament Detayları Modal */}
      {showFilamentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filament Kullanım Detayları</h3>
              <button
                onClick={() => setShowFilamentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icons.XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              {calculateFilamentUsage().map((filament, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{filament.type}</div>
                      <div className="text-sm text-gray-600">
                        {filament.color} - {filament.brand}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{filament.totalWeight} g</div>
                      <div className="text-sm text-gray-600">
                        {filament.weight}g × {formData.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-right">
                <div className="text-sm text-gray-600">Toplam Filament</div>
                <div className="font-semibold text-lg">
                  {calculateFilamentUsage().reduce((total, f) => total + parseFloat(f.totalWeight), 0).toFixed(2)} gram
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
