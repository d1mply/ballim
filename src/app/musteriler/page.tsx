'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon } from '@/utils/Icons';

// Filament fiyatı tipi
interface FilamentPrice {
  type: string;
  price: number;
}

// Örnek müşteri tipi
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
  taxNumber?: string; // Vergi numarası alanı eklendi
  orders: number;
  totalSpent: number;
  lastOrder?: string;
  address?: string;
  type: 'Bireysel' | 'Kurumsal'; // Müşteri tipi
  username: string; // Giriş kullanıcı adı
  password: string; // Giriş şifresi
  filamentPrices: FilamentPrice[]; // Özel filament fiyatları
}

export default function MusterilerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filamentInputs, setFilamentInputs] = useState<FilamentPrice[]>([]);
  const [filamentTypes, setFilamentTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Yeni müşteri formu için state
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    company: '',
    taxNumber: '', // Vergi numarası başlangıç değeri
    address: '',
    type: 'Bireysel',
    username: '',
    password: '',
    filamentPrices: [{ type: 'PLA', price: 0 }],
    orders: 0,
    totalSpent: 0
  });

  // Filament tiplerini API'den çek
  useEffect(() => {
    const fetchFilamentTypes = async () => {
      try {
        const response = await fetch('/api/filaments/types');
        if (response.ok) {
          const types = await response.json();
          if (Array.isArray(types) && types.length > 0) {
            setFilamentTypes(types);
          } else {
            setFilamentTypes([]);
          }
        } else {
          setFilamentTypes([]);
        }
      } catch (error) {
        console.error('Filament tipleri yüklenirken hata:', error);
        setFilamentTypes([]);
      }
    };

    fetchFilamentTypes();
  }, []);

  // Müşterileri veritabanından yükle
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/customers');
        
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setCustomers(data);
        } else {
          console.log('Müşteri verisi bulunamadı');
          setCustomers([]);
        }
      } catch (err) {
        console.error('Müşteri verilerini getirirken hata:', err);
        setError('Müşteri verileri yüklenirken bir hata oluştu: ' + 
          (err instanceof Error ? err.message : 'Bilinmeyen hata'));
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Arama
  const filteredCustomers = customers.filter((customer) => {
    try {
      const searchLower = searchTerm.toLowerCase();
      
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        (customer.company && customer.company.toLowerCase().includes(searchLower)) ||
        (customer.username && customer.username.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('Müşteri filtrelemede hata:', error, customer);
      return false;
    }
  });

  // Form veri değişikliği
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filament fiyatı değişikliği
  const handleFilamentChange = (index: number, field: 'type' | 'price', value: string) => {
    const newFilaments = [...filamentInputs];
    if (field === 'type') {
      newFilaments[index].type = value;
    } else {
      newFilaments[index].price = parseFloat(value) || 0;
    }
    
    setFilamentInputs(newFilaments);
    setFormData(prev => ({
      ...prev,
      filamentPrices: newFilaments
    }));
  };

  // Yeni filament fiyatı ekle
  const addFilamentPrice = () => {
    // Varsayılan olarak ilk filament tipini kullan
    const defaultType = filamentTypes.length > 0 ? filamentTypes[0] : '';
    setFilamentInputs(prev => [...prev, { type: defaultType, price: 0 }]);
  };

  // Filament fiyatı sil
  const removeFilamentPrice = (index: number) => {
    if (filamentInputs.length <= 1) return;
    
    const newFilaments = [...filamentInputs];
    newFilaments.splice(index, 1);
    setFilamentInputs(newFilaments);
    
    setFormData(prev => ({
      ...prev,
      filamentPrices: newFilaments
    }));
  };

  // Yeni müşteri eklemek için modalı aç
  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    
    // Varsayılan filament tipini belirle
    const defaultType = filamentTypes.length > 0 ? filamentTypes[0] : '';
    
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      taxNumber: '',
      address: '',
      type: 'Bireysel',
      username: '',
      password: '',
      filamentPrices: [{ type: defaultType, price: 0 }],
      orders: 0,
      totalSpent: 0
    });
    
    setFilamentInputs([{ type: defaultType, price: 0 }]);
    setIsModalOpen(true);
  };

  // Müşteri düzenlemek için modalı aç
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    
    // Müşterinin filament fiyatları yoksa veya boşsa, varsayılan değerle doldur
    const defaultType = filamentTypes.length > 0 ? filamentTypes[0] : '';
    const filamentPrices = customer.filamentPrices && customer.filamentPrices.length > 0 
      ? customer.filamentPrices 
      : [{ type: defaultType, price: 0 }];
    
    // Dosyada olmayan filament tiplerini kontrol et
    const validatedFilamentPrices = filamentPrices.map(fp => {
      if (filamentTypes.length > 0 && !filamentTypes.includes(fp.type)) {
        return { ...fp, type: defaultType };
      }
      return fp;
    });
    
    setFormData({ 
      ...customer, 
      filamentPrices: validatedFilamentPrices 
    });
    setFilamentInputs([...validatedFilamentPrices]);
    setIsModalOpen(true);
  };

  // Müşteri silme işlemi
  const handleDeleteCustomer = async (customerId: string) => {
    const confirmDelete = window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?');
    if (confirmDelete) {
      try {
        // API'den sil
        const response = await fetch(`/api/customers?id=${customerId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API hatası: ${response.status} ${response.statusText}`);
        }
        
        // State'i güncelle
        setCustomers(prevList => prevList.filter(item => item.id !== customerId));
        
        console.log('Müşteri silindi');
      } catch (error) {
        console.error('Müşteri silinirken hata:', error);
        alert(error instanceof Error ? error.message : 'Müşteri silinirken bir hata oluştu!');
      }
    }
  };

  // Müşteri kaydetme
  const handleSaveCustomer = async () => {
    if (!formData.name || !formData.phone || !formData.email || !formData.username || !formData.password) {
      alert('Lütfen zorunlu alanları doldurun (Ad Soyad, Telefon, E-posta, Kullanıcı Adı, Şifre)');
      return;
    }
    
    // Kurumsal müşteri için vergi numarası zorunlu
    if (formData.type === 'Kurumsal' && !formData.taxNumber) {
      alert('Kurumsal müşteriler için vergi numarası zorunludur.');
      return;
    }

    // Filament fiyatlarını doğru şekilde hazırla
    let filamentPrices = [];
    
    if (formData.filamentPrices && Array.isArray(formData.filamentPrices) && formData.filamentPrices.length > 0) {
      filamentPrices = formData.filamentPrices.map(fp => ({
        type: fp.type || 'PLA',
        price: parseFloat(String(fp.price)) || 0
      }));
    } else {
      filamentPrices = [{ type: 'PLA', price: 0 }];
    }
    
    // Sadece API'nin bekledği alanları içerecek temiz bir veri hazırla
    const customerData = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      company: formData.company || '',
      address: formData.address || '',
      notes: formData.notes || '',
      type: formData.type || 'Bireysel',
      taxNumber: formData.taxNumber || '',
      username: formData.username,
      password: formData.password,
      filamentPrices
    };
    
    try {
      console.log("Gönderilecek müşteri verisi:", customerData);
      
      if (selectedCustomer) {
        // Müşteri güncelleme
        const response = await fetch('/api/customers', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedCustomer.id,
            ...customerData
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `API hatası: ${response.status} ${response.statusText}`;
          console.error('Müşteri güncelleme hatası:', errorMessage);
          throw new Error(errorMessage);
        }
        
        const updatedCustomer = await response.json();
        console.log("API'den gelen güncellenmiş müşteri:", updatedCustomer);
        
        // State'i güncelle
        setCustomers(prevList => 
          prevList.map(item => 
            item.id === selectedCustomer.id ? updatedCustomer : item
          )
        );
      } else {
        // Yeni müşteri ekleme
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customerData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `API hatası: ${response.status} ${response.statusText}`;
          console.error('Müşteri ekleme hatası:', errorMessage);
          throw new Error(errorMessage);
        }
        
        const newCustomer = await response.json();
        
        // State'i güncelle
        setCustomers(prevList => [...prevList, newCustomer]);
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error('Müşteri kaydedilirken hata:', error);
      alert(error instanceof Error ? error.message : 'Müşteri kaydedilirken bir hata oluştu!');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Müşteriler</h1>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('/api/db-diagnostics');
                  const data = await response.json();
                  alert(`Diagnostik Sonuçları:\n\n${data.diagnostics.join('\n')}\n\nHatalar:\n${data.errors.length > 0 ? data.errors.join('\n') : 'Hata Yok'}`);
                } catch (error) {
                  alert(`Diagnostik hatası: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
              className="btn-outline"
              title="Detaylı veritabanı tanılama"
            >
              Detaylı Test
            </button>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('/api/test-db');
                  const data = await response.json();
                  if (data.status === 'ok') {
                    alert(`Veritabanı bağlantısı başarılı!\nSunucu saati: ${data.time}\nBağlantı havuzu: ${JSON.stringify(data.poolStatus)}`);
                  } else {
                    alert(`Bağlantı hatası: ${data.error || 'Bilinmeyen hata'}`);
                  }
                } catch (error) {
                  alert(`Test isteği gönderilirken hata: ${error instanceof Error ? error.message : String(error)}`);
                }
              }}
              className="btn-outline"
              title="Veritabanı bağlantısını test et"
            >
              DB Test
            </button>
            <button 
              onClick={handleAddCustomer}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon /> Yeni Müşteri
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
          <div className="search-container flex-grow">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder="Müşteri ara..."
              className="w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-10 text-center">
            <div className="spinner mb-4"></div>
            <p>Müşteri verileri yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-danger">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              Yeniden Dene
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Tip</th>
                  <th>İletişim</th>
                  <th>Vergi No</th>
                  <th>Kullanıcı Adı</th>
                  <th>Filamentler</th>
                  <th>Sipariş Sayısı</th>
                  <th>Toplam</th>
                  <th>Son Sipariş</th>
                  <th className="text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.company && (
                            <div className="text-sm text-muted-foreground">{customer.company}</div>
                          )}
                        </div>
                      </td>
                      <td>{customer.type || 'Bireysel'}</td>
                      <td>
                        <div>
                          <div>{customer.phone}</div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                        </div>
                      </td>
                      <td>
                        {customer.type === 'Kurumsal' ? (customer.taxNumber || '-') : '-'}
                      </td>
                      <td>{customer.username || '-'}</td>
                      <td>
                        <div className="text-sm">
                          {customer.filamentPrices && customer.filamentPrices.length > 0 ? (
                            customer.filamentPrices.map((fp, i) => (
                              <div key={i}>
                                {fp.type}: {fp.price}₺
                              </div>
                            ))
                          ) : (
                            <div>Tanımlanmamış</div>
                          )}
                        </div>
                      </td>
                      <td>{customer.orders || 0}</td>
                      <td>{customer.totalSpent || 0}₺</td>
                      <td>{customer.lastOrder || '-'}</td>
                      <td>
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => handleEditCustomer(customer)}
                            className="action-btn action-btn-edit"
                            title="Düzenle"
                          >
                            <EditIcon />
                          </button>
                          <button 
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="action-btn action-btn-delete"
                            title="Sil"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground">
                      Müşteri bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Müşteri Ekle/Düzenle Modalı */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h2 className="text-lg font-semibold">
                {selectedCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Müşteri Tipi</label>
                    <select 
                      name="type"
                      value={formData.type || 'Bireysel'}
                      onChange={handleFormChange}
                      className="w-full"
                    >
                      <option value="Bireysel">Bireysel</option>
                      <option value="Kurumsal">Kurumsal</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Ad Soyad*</label>
                    <input 
                      type="text" 
                      name="name"
                      placeholder="Ad Soyad"
                      value={formData.name || ''}
                      onChange={handleFormChange}
                      className="w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Firma {formData.type === 'Kurumsal' ? '*' : '(İsteğe bağlı)'}</label>
                    <input 
                      type="text" 
                      name="company"
                      placeholder="Firma"
                      value={formData.company || ''}
                      onChange={handleFormChange}
                      className="w-full"
                      required={formData.type === 'Kurumsal'}
                    />
                  </div>
                  
                  {formData.type === 'Kurumsal' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Vergi Numarası*</label>
                      <input 
                        type="text" 
                        name="taxNumber"
                        placeholder="Vergi Numarası"
                        value={formData.taxNumber || ''}
                        onChange={handleFormChange}
                        className="w-full"
                        required
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefon*</label>
                    <input 
                      type="tel" 
                      name="phone"
                      placeholder="Telefon"
                      value={formData.phone || ''}
                      onChange={handleFormChange}
                      className="w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">E-posta*</label>
                    <input 
                      type="email" 
                      name="email"
                      placeholder="E-posta"
                      value={formData.email || ''}
                      onChange={handleFormChange}
                      className="w-full"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Adres</label>
                    <textarea 
                      name="address"
                      placeholder="Adres"
                      rows={2}
                      value={formData.address || ''}
                      onChange={handleFormChange}
                      className="w-full"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Kullanıcı Adı*</label>
                    <input 
                      type="text" 
                      name="username"
                      placeholder="Kullanıcı Adı"
                      value={formData.username || ''}
                      onChange={handleFormChange}
                      className="w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Şifre*</label>
                    <input 
                      type="password" 
                      name="password"
                      placeholder="Şifre"
                      value={formData.password || ''}
                      onChange={handleFormChange}
                      className="w-full"
                      required
                    />
                  </div>
                </div>
                
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Filament Fiyatları</h3>
                    <button 
                      type="button"
                      onClick={addFilamentPrice}
                      className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <PlusIcon /> Filament Ekle
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {filamentInputs.map((filament, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <label className="block text-xs mb-1">Filament Tipi</label>
                          <select
                            value={filament.type}
                            onChange={(e) => handleFilamentChange(index, 'type', e.target.value)}
                            className="w-full"
                          >
                            {filamentTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-xs mb-1">Fiyat (₺/g)</label>
                          <input
                            type="number"
                            value={filament.price}
                            onChange={(e) => handleFilamentChange(index, 'price', e.target.value)}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full"
                          />
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => removeFilamentPrice(index)}
                          disabled={filamentInputs.length <= 1}
                          className="mt-6 p-1 text-danger opacity-70 hover:opacity-100 disabled:opacity-30"
                          title="Filament Fiyatını Kaldır"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-outline"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                className="btn-primary"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 