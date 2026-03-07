import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Odeme, OdemeCustomer, OdemeSiparis, OdemeFormData } from '../types';
import type { LoggedInUser } from '../app/page';

export const ODEME_YONTEMLERI = [
  'Nakit', 'Havale/EFT', 'Kredi Kartı', 'Banka Kartı', 'Çek', 'Senet', 'Diğer'
];

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(amount);
}

const DEFAULT_FORM_DATA: OdemeFormData = {
  musteri_id: '',
  siparis_id: '',
  odeme_tarihi: new Date().toISOString().split('T')[0],
  tutar: '',
  odeme_yontemi: 'Nakit',
  vade_ay: '',
  durum: 'Ödendi',
  aciklama: '',
};

export function useOdemelerData() {
  const router = useRouter();
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [customers, setCustomers] = useState<OdemeCustomer[]>([]);
  const [siparisler, setSiparisler] = useState<OdemeSiparis[]>([]);
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMusteriId, setSelectedMusteriId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOdeme, setSelectedOdeme] = useState<Odeme | null>(null);
  const [formData, setFormData] = useState<OdemeFormData>({ ...DEFAULT_FORM_DATA });
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (!loggedUserJson) { router.push('/'); return; }
    try {
      const userData = JSON.parse(loggedUserJson) as LoggedInUser;
      setUser(userData);
      if (userData.type !== 'admin') router.push('/');
    } catch {
      router.push('/');
    }
  }, [router]);

  const fetchCustomers = useCallback(async () => {
    if (!user || user.type !== 'admin') return;
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error(`API hatası: ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.error('Müşteriler yüklenirken hata:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.type === 'admin' && customers.length === 0) fetchCustomers();
  }, [user, fetchCustomers, customers.length]);

  useEffect(() => {
    const fetchSiparisler = async () => {
      if (!selectedMusteriId || !user || user.type !== 'admin') return;
      try {
        const response = await fetch(`/api/orders?customerId=${selectedMusteriId}`);
        if (!response.ok) throw new Error(`API hatası: ${response.status}`);
        const data = await response.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setSiparisler(list.map((order: any) => ({
          id: String(order.id),
          musteri_id: selectedMusteriId,
          musteri_adi: order.customer_name || order.customerName || '',
          order_date: order.order_date || order.orderDate || '',
          total_amount: order.total_amount ?? order.totalAmount ?? 0,
          status: order.status || ''
        })));
      } catch (err) {
        console.error('Siparişler yüklenirken hata:', err);
      }
    };
    selectedMusteriId ? fetchSiparisler() : setSiparisler([]);
  }, [selectedMusteriId, user]);

  const loadOdemeler = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = '/api/odemeler';
      if (selectedMusteriId) url += `?customerId=${selectedMusteriId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API hatası: ${response.status}`);
      const data = await response.json();
      const formatted = Array.isArray(data) ? data.map((o: any) => ({
        ...o,
        siparis_id: o.siparis_id ? `SIP-${String(o.siparis_id).padStart(3, '0')}` : null
      })) : [];
      setOdemeler(formatted);
    } catch {
      setError('Ödeme verileri yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMusteriId]);

  useEffect(() => {
    if (user?.type === 'admin') loadOdemeler();
  }, [user, selectedMusteriId, loadOdemeler]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMusteriChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const musteriId = e.target.value;
    setSelectedMusteriId(musteriId || null);
    setFormData(prev => ({ ...prev, musteri_id: musteriId, siparis_id: '' }));
  };

  const handleAddOdeme = () => {
    setSelectedOdeme(null);
    setFormData({ ...DEFAULT_FORM_DATA, musteri_id: selectedMusteriId || '' });
    setIsModalOpen(true);
  };

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

  const handleSaveOdeme = async () => {
    if (!formData.musteri_id || !formData.odeme_tarihi || !formData.tutar || !formData.odeme_yontemi) {
      setError('Lütfen zorunlu alanları doldurun');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const odemeData: any = {
        ...formData,
        tutar: parseFloat(formData.tutar),
        vade_ay: formData.vade_ay ? parseInt(formData.vade_ay) : null,
        siparis_id: formData.siparis_id || null
      };
      const method = selectedOdeme ? 'PUT' : 'POST';
      if (selectedOdeme) odemeData.id = selectedOdeme.id;
      const response = await fetch('/api/odemeler', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(odemeData),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API hatası');
      }
      const responseData = await response.json();
      setFormData({ ...DEFAULT_FORM_DATA });
      setIsModalOpen(false);
      setSelectedOdeme(null);
      setSuccess(responseData.message || (selectedOdeme ? 'Ödeme başarıyla güncellendi' : 'Ödeme başarıyla kaydedildi'));
      await loadOdemeler();
    } catch (err) {
      setError('Ödeme kaydedilirken bir hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOdeme = async (id: string) => {
    if (!confirm('Bu ödemeyi silmek istediğinize emin misiniz?')) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/odemeler?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('API hatası');
      setSuccess('Ödeme başarıyla silindi');
      await loadOdemeler();
    } catch {
      setError('Ödeme silinirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintReceipt = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/receipt`);
      if (!response.ok) throw new Error(`API hatası: ${response.status}`);
      const data = await response.json();
      setReceiptData(data);
      setIsReceiptOpen(true);
    } catch {
      alert('Ödeme makbuzu oluşturulurken bir hata oluştu!');
    }
  };

  return {
    user, customers, siparisler, odemeler,
    isLoading, error, success,
    selectedMusteriId, isModalOpen, selectedOdeme, formData,
    isReceiptOpen, receiptData,
    setIsModalOpen, setIsReceiptOpen, setReceiptData,
    handleFormChange, handleMusteriChange,
    handleAddOdeme, handleEditOdeme, handleSaveOdeme,
    handleDeleteOdeme, handlePrintReceipt,
  };
}
