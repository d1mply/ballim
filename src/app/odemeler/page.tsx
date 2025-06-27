'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, FilterIcon } from '@/utils/Icons';
import { LoggedInUser } from '../page';

// Ödeme tipi
interface Odeme {
  id: string;
  musteri_id: string;
  musteri_adi: string;
  siparis_id: string | null;
  odeme_tarihi: string;
  tutar: number;
  odeme_yontemi: string;
  vade_ay: number | null;
  durum: 'Ödendi' | 'Beklemede' | 'İptal Edildi';
  aciklama: string | null;
  created_at: string;
}

// Müşteri tipi
interface Customer {
  id: string;
  name: string;
  company?: string;
}

// Sipariş tipi
interface Siparis {
  id: string;
  musteri_id: string;
  musteri_adi: string;
  order_date: string;
  total_amount: number;
  status: string;
}

export default function OdemelerPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [filteredOdemeler, setFilteredOdemeler] = useState<Odeme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMusteriId, setSelectedMusteriId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOdeme, setSelectedOdeme] = useState<Odeme | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [dateRange, setDateRange] = useState<{startDate: string, endDate: string}>({
    startDate: '',
    endDate: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Form verisi
  const [formData, setFormData] = useState({
    musteri_id: '',
    siparis_id: '',
    odeme_tarihi: new Date().toISOString().split('T')[0],
    tutar: '',
    odeme_yontemi: 'Nakit',
    vade_ay: '',
    durum: 'Ödendi' as 'Ödendi' | 'Beklemede' | 'İptal Edildi',
    aciklama: '',
  });
  
  // Ödeme yöntemleri
  const odemeYontemleri = [
    'Nakit',
    'Havale/EFT',
    'Kredi Kartı',
    'Banka Kartı',
    'Çek',
    'Senet',
    'Diğer'
  ];
  
  // Giriş yapmış kullanıcıyı yükle ve admin kontrolü yap
  useEffect(() => {
    const loadUser = () => {
      const loggedUserJson = localStorage.getItem('loggedUser');
      if (loggedUserJson) {
        try {
          const userData = JSON.parse(loggedUserJson) as LoggedInUser;
          setUser(userData);
          
          // Sadece admin erişebilir, müşteri hesabı ise ana sayfaya yönlendir
          if (userData.type !== 'admin') {
            router.push('/');
          }
        } catch (error) {
          console.error('Kullanıcı bilgisi yüklenirken hata:', error);
          router.push('/');
        }
      } else {
        // Kullanıcı girişi yapılmamışsa ana sayfaya yönlendir
        router.push('/');
      }
    };
    
    loadUser();
  }, [router]);
  
  // Müşterileri yükle
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user || user.type !== 'admin') return;
      
      try {
        const response = await fetch('/api/customers');
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status}`);
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
          setCustomers(data);
        }
      } catch (error) {
        console.error('Müşteriler yüklenirken hata:', error);
      }
    };
    
    if (user?.type === 'admin') {
      fetchCustomers();
    }
  }, [user]);
  
  // Siparişleri yükle (müşteri seçildiğinde)
  useEffect(() => {
    const fetchSiparisler = async () => {
      if (!selectedMusteriId || !user || user.type !== 'admin') return;
      
      try {
        const response = await fetch(`/api/orders?customerId=${selectedMusteriId}`);
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status}`);
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
          const formattedSiparisler: Siparis[] = data.map(order => ({
            id: order.id.toString().replace('SIP-', ''), // SIP- önekini kaldır
            musteri_id: selectedMusteriId,
            musteri_adi: order.customerName,
            order_date: order.orderDate,
            total_amount: order.totalAmount,
            status: order.status
          }));
          setSiparisler(formattedSiparisler);
        }
      } catch (error) {
        console.error('Siparişler yüklenirken hata:', error);
      }
    };
    
    if (selectedMusteriId) {
      fetchSiparisler();
    } else {
      setSiparisler([]);
    }
  }, [selectedMusteriId, user]);
  
  // Ödemeleri filtrele
  useEffect(() => {
    if (!odemeler.length) return;

    let filtered = [...odemeler];

    // Arama filtresi
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(odeme => 
        odeme.musteri_adi.toLowerCase().includes(searchLower) ||
        odeme.odeme_yontemi.toLowerCase().includes(searchLower) ||
        (odeme.aciklama && odeme.aciklama.toLowerCase().includes(searchLower))
      );
    }

    // Durum filtresi
    if (statusFilter) {
      filtered = filtered.filter(odeme => odeme.durum === statusFilter);
    }

    // Tarih filtresi
    if (dateRange.startDate) {
      filtered = filtered.filter(odeme => 
        new Date(odeme.odeme_tarihi) >= new Date(dateRange.startDate)
      );
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(odeme => 
        new Date(odeme.odeme_tarihi) <= new Date(dateRange.endDate)
      );
    }

    setFilteredOdemeler(filtered);
  }, [odemeler, searchTerm, statusFilter, dateRange]);
  
  // Ödemeleri yükle
  const loadOdemeler = async () => {
    console.log('Ödemeler yükleniyor...'); // Debug log
    setIsLoading(true);
    setError(null);
    
    try {
      let url = '/api/odemeler';
      if (selectedMusteriId) {
        url += `?customerId=${selectedMusteriId}`;
      }
      
      console.log('API çağrısı yapılıyor:', url); // Debug log
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Yüklenen ödemeler:', data); // Debug log
      
      // Ödemeleri formatlayarak state'e kaydet
      const formattedOdemeler = Array.isArray(data) ? data.map(odeme => ({
        ...odeme,
        siparis_id: odeme.siparis_id ? `SIP-${String(odeme.siparis_id).padStart(3, '0')}` : null
      })) : [];
      
      setOdemeler(formattedOdemeler);
      setFilteredOdemeler(formattedOdemeler);
    } catch (error) {
      console.error('Ödeme verileri yüklenirken hata:', error);
      setError('Ödeme verileri yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Form değişikliklerini işle
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Ödemeyi kaydet
  const handleSaveOdeme = async () => {
    if (!formData.musteri_id || !formData.odeme_tarihi || !formData.tutar || !formData.odeme_yontemi) {
      setError('Lütfen zorunlu alanları doldurun');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const odemeData = {
        ...formData,
        tutar: parseFloat(formData.tutar),
        vade_ay: formData.vade_ay ? parseInt(formData.vade_ay) : null,
        siparis_id: formData.siparis_id || null
      };
      
      console.log('Gönderilen ödeme verisi:', odemeData); // Debug log
      
      let url = '/api/odemeler';
      let method = 'POST';
      
      if (selectedOdeme) {
        method = 'PUT';
        odemeData.id = selectedOdeme.id;
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(odemeData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API hatası');
      }
      
      const responseData = await response.json();
      console.log('API yanıtı:', responseData); // Debug log
      
      // Formu sıfırla ve modal'ı kapat
      setFormData({
        musteri_id: '',
        siparis_id: '',
        odeme_tarihi: new Date().toISOString().split('T')[0],
        tutar: '',
        odeme_yontemi: 'Nakit',
        vade_ay: '',
        durum: 'Ödendi',
        aciklama: '',
      });
      
      setIsModalOpen(false);
      setSelectedOdeme(null);
      setSuccess(responseData.message || (selectedOdeme ? 'Ödeme başarıyla güncellendi' : 'Ödeme başarıyla kaydedildi'));
      
      // Verileri yeniden yükle
      await loadOdemeler();
      
    } catch (error) {
      console.error('Ödeme kaydedilirken hata:', error);
      setError('Ödeme kaydedilirken bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ödeme sil
  const handleDeleteOdeme = async (id: string) => {
    if (!confirm('Bu ödemeyi silmek istediğinize emin misiniz?')) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/odemeler?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('API hatası');
      }
      
      setSuccess('Ödeme başarıyla silindi');
      
      // Verileri yeniden yükle
      await loadOdemeler();
      
    } catch (error) {
      console.error('Ödeme silinirken hata:', error);
      setError('Ödeme silinirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Yeni ödeme ekle
  const handleAddOdeme = () => {
    setSelectedOdeme(null);
    setFormData({
      musteri_id: selectedMusteriId || '',
      siparis_id: '',
      odeme_tarihi: new Date().toISOString().split('T')[0],
      tutar: '',
      odeme_yontemi: 'Nakit',
      vade_ay: '',
      durum: 'Ödendi',
      aciklama: '',
    });
    setIsModalOpen(true);
  };
  
  // Ödeme düzenle
  const handleEditOdeme = (odeme: Odeme) => {
    setSelectedOdeme(odeme);
    setFormData({
      musteri_id: odeme.musteri_id,
      siparis_id: odeme.siparis_id || '',
      odeme_tarihi: odeme.odeme_tarihi,
      tutar: odeme.tutar.toString(),
      odeme_yontemi: odeme.odeme_yontemi,
      vade_ay: odeme.vade_ay ? odeme.vade_ay.toString() : '',
      durum: odeme.durum,
      aciklama: odeme.aciklama || '',
    });
    setIsModalOpen(true);
  };
  
  // Müşteri değiştiğinde sipariş seçimini sıfırla
  const handleMusteriChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const musteriId = e.target.value;
    setSelectedMusteriId(musteriId || null);
    setFormData(prev => ({
      ...prev,
      musteri_id: musteriId,
      siparis_id: ''
    }));
  };
  
  // Para birimi formatla
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Ödemeleri yükle (component mount olduğunda ve müşteri seçildiğinde)
  useEffect(() => {
    if (!user || user.type !== 'admin') return;
    console.log('useEffect tetiklendi - Ödemeler yüklenecek'); // Debug log
    loadOdemeler();
  }, [user, selectedMusteriId]);
  
  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Ödemeler</h1>
        
        {/* Başarı mesajı */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        {/* Hata mesajı */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Müşteri seçimi */}
          <div>
            <label htmlFor="musteri" className="block text-sm font-medium mb-1">
              Müşteri Seçin
            </label>
            <select
              id="musteri"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              value={selectedMusteriId || ''}
              onChange={handleMusteriChange}
            >
              <option value="">Tüm Müşteriler</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.company ? `(${customer.company})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          {/* Arama kutusu */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium mb-1">
              Ara
            </label>
            <div className="search-container">
              <SearchIcon className="search-icon" />
              <input
                type="text"
                id="search"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                placeholder="Müşteri, açıklama veya ödeme yöntemi ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Durum filtresi */}
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium mb-1">
              Durum
            </label>
            <select
              id="statusFilter"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tüm Durumlar</option>
              <option value="Ödendi">Ödendi</option>
              <option value="Beklemede">Beklemede</option>
              <option value="İptal Edildi">İptal Edildi</option>
            </select>
          </div>
          
          {/* Tarih filtresi */}
          <div className="flex gap-2">
            <div className="w-1/2">
              <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                Başlangıç
              </label>
              <input
                type="date"
                id="startDate"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({...prev, startDate: e.target.value}))}
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                Bitiş
              </label>
              <input
                type="date"
                id="endDate"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({...prev, endDate: e.target.value}))}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mb-4">
          <button
            onClick={handleAddOdeme}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            Yeni Ödeme
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {filteredOdemeler.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  {selectedMusteriId 
                    ? 'Bu müşteri için ödeme bulunamadı.' 
                    : 'Ödeme bulunamadı.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Müşteri
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sipariş No
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tutar
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ödeme Yöntemi
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Açıklama
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {console.log('Filtrelenmiş ödemeler:', filteredOdemeler)}
                    {filteredOdemeler.map((odeme) => (
                      <tr key={odeme.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(odeme.odeme_tarihi).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {odeme.musteri_adi}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {odeme.siparis_id ? `SIP-${String(odeme.siparis_id).padStart(3, '0')}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(odeme.tutar)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {odeme.odeme_yontemi}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            odeme.durum === 'Ödendi' ? 'bg-green-100 text-green-800' :
                            odeme.durum === 'Beklemede' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {odeme.durum}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {odeme.aciklama || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditOdeme(odeme)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <EditIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOdeme(odeme.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Ödeme ekleme/düzenleme modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white rounded-lg shadow-xl transform transition-all max-w-lg w-full p-6 z-10">
              <h3 className="text-lg font-medium mb-4">
                {selectedOdeme ? 'Ödemeyi Düzenle' : 'Yeni Ödeme Ekle'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="form-musteri" className="block text-sm font-medium mb-1">
                    Müşteri
                  </label>
                  <select
                    id="form-musteri"
                    name="musteri_id"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                    value={formData.musteri_id}
                    onChange={handleMusteriChange}
                    required
                  >
                    <option value="">Müşteri Seçin</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.company ? `(${customer.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {formData.musteri_id && (
                  <div>
                    <label htmlFor="form-siparis" className="block text-sm font-medium mb-1">
                      Sipariş (İsteğe bağlı)
                    </label>
                    <select
                      id="form-siparis"
                      name="siparis_id"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                      value={formData.siparis_id}
                      onChange={handleFormChange}
                    >
                      <option value="">Sipariş Seçin</option>
                      {siparisler.map((siparis) => (
                        <option key={siparis.id} value={siparis.id}>
                          SIP-{siparis.id.padStart(3, '0')} ({formatCurrency(siparis.total_amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label htmlFor="form-tarih" className="block text-sm font-medium mb-1">
                    Ödeme Tarihi
                  </label>
                  <input
                    type="date"
                    id="form-tarih"
                    name="odeme_tarihi"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                    value={formData.odeme_tarihi}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="form-tutar" className="block text-sm font-medium mb-1">
                    Tutar (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="form-tutar"
                    name="tutar"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                    value={formData.tutar}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="form-odeme-yontemi" className="block text-sm font-medium mb-1">
                    Ödeme Yöntemi
                  </label>
                  <select
                    id="form-odeme-yontemi"
                    name="odeme_yontemi"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                    value={formData.odeme_yontemi}
                    onChange={handleFormChange}
                    required
                  >
                    {odemeYontemleri.map(yontem => (
                      <option key={yontem} value={yontem}>
                        {yontem}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="form-vade" className="block text-sm font-medium mb-1">
                    Vade (Ay) - İsteğe bağlı
                  </label>
                  <input
                    type="number"
                    id="form-vade"
                    name="vade_ay"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                    value={formData.vade_ay}
                    onChange={handleFormChange}
                    min="0"
                    placeholder="Vade yoksa boş bırakın"
                  />
                </div>
                
                <div>
                  <label htmlFor="form-durum" className="block text-sm font-medium mb-1">
                    Ödeme Durumu
                  </label>
                  <select
                    id="form-durum"
                    name="durum"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                    value={formData.durum}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="Ödendi">Ödendi</option>
                    <option value="Beklemede">Beklemede</option>
                    <option value="İptal Edildi">İptal Edildi</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="form-aciklama" className="block text-sm font-medium mb-1">
                    Açıklama
                  </label>
                  <textarea
                    id="form-aciklama"
                    name="aciklama"
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                    value={formData.aciklama}
                    onChange={handleFormChange}
                    placeholder="Ödeme ile ilgili notlar..."
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveOdeme}
                >
                  {selectedOdeme ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 