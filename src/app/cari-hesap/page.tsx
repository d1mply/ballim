'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { SearchIcon } from '@/utils/Icons';
import { LoggedInUser } from '../page';

// Müşteri tipi
interface Customer {
  id: string;
  name: string;
}

// Cari hesap işlemi tipi
interface CariHesapIslemi {
  id: string;
  musteri_id: string;
  musteri_adi: string;
  tarih: string;
  aciklama: string;
  islem_turu: 'Borçlandırma' | 'Tahsilat';
  tutar: number;
  odeme_yontemi: string | null;
  siparis_id: string | null;
  bakiye: number;
  created_at: string;
}

export default function CariHesapPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [, setIslemler] = useState<CariHesapIslemi[]>([]);
  const [filteredIslemler, setFilteredIslemler] = useState<CariHesapIslemi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMusteriId, setSelectedMusteriId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [user, setUser] = useState<LoggedInUser | null>(null);

  // Müşterileri yükle
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers');
        if (!response.ok) throw new Error('Müşteriler getirilemedi');
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error('Müşteriler yüklenirken hata:', error);
      }
    };

    // Sadece admin için müşterileri yükle
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      const userData = JSON.parse(loggedUserJson);
      setUser(userData);
      if (userData.type === 'admin') {
        fetchCustomers();
      } else if (userData.type === 'customer') {
        setSelectedMusteriId(userData.id);
      }
    }
  }, []);

  // Cari hesap verilerini yükle
  useEffect(() => {
    const fetchCariHesap = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        let url = '/api/cari-hesap';
        if (selectedMusteriId || user.type === 'customer') {
          const musteriId = selectedMusteriId || user.id;
          url += `?customerId=${musteriId}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Veriler getirilemedi');
        
        const data = await response.json();
        setIslemler(data);
        setFilteredIslemler(data);
      } catch (error) {
        console.error('Cari hesap verileri yüklenirken hata:', error);
        setError('Veriler yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCariHesap();
  }, [selectedMusteriId, user]);

  // Özet bilgileri hesapla
  const [summary, setSummary] = useState({
    toplamBorc: 0,
    toplamOdeme: 0,
    guncelBakiye: 0
  });

  useEffect(() => {
    if (filteredIslemler.length > 0) {
      const ozet = filteredIslemler.reduce((acc, islem) => {
        if (islem.islem_turu === 'Borçlandırma') {
          acc.toplamBorc += islem.tutar;
        } else if (islem.islem_turu === 'Tahsilat') {
          acc.toplamOdeme += islem.tutar;
        }
        return acc;
      }, {
        toplamBorc: 0,
        toplamOdeme: 0
      });

      ozet.guncelBakiye = ozet.toplamBorc - ozet.toplamOdeme;
      setSummary(ozet);
    }
  }, [filteredIslemler]);

  // Para birimi formatla
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Cari Hesap Hareketleri</h1>
          
          {/* Müşteri seçimi (sadece admin için) */}
          {user?.type === 'admin' && (
            <div className="flex items-center space-x-4">
              <select
                className="rounded-md border border-gray-300 p-2"
                value={selectedMusteriId || ''}
                onChange={(e) => setSelectedMusteriId(e.target.value || null)}
              >
                <option value="">Tüm Müşteriler</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Toplam Borç</h3>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.toplamBorc)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Toplam Ödeme</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.toplamOdeme)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Güncel Bakiye</h3>
            <p className={`text-2xl font-bold ${summary.guncelBakiye >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(summary.guncelBakiye))}
            </p>
          </div>
        </div>

        {/* Arama ve Filtreleme */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-4">
            <div className="flex items-center space-x-4">
              <div className="search-container flex-1">
                <SearchIcon className="search-icon" />
                <input
                  type="text"
                  placeholder="Ara..."
                  className="w-full pr-4 py-2 rounded-lg border border-gray-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* İşlem Tablosu */}
        {isLoading ? (
          <div className="text-center py-4">Yükleniyor...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : filteredIslemler.length === 0 ? (
          <div className="text-center py-4">Kayıt bulunamadı</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    {(!selectedMusteriId && user?.type === 'admin') && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem Türü</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Yöntemi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bakiye</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIslemler.map((islem) => (
                    <tr key={islem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(islem.tarih).toLocaleDateString('tr-TR')}
                      </td>
                      {(!selectedMusteriId && user?.type === 'admin') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {islem.musteri_adi}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-500">{islem.aciklama}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          islem.islem_turu === 'Tahsilat' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {islem.islem_turu}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {islem.odeme_yontemi || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={islem.islem_turu === 'Tahsilat' ? 'text-green-600' : 'text-blue-600'}>
                          {formatCurrency(islem.tutar)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={islem.bakiye >= 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(Math.abs(islem.bakiye))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}