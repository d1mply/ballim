import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';

export interface FilamentPrice {
  type: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
  taxNumber?: string;
  orders: number;
  totalSpent: number;
  lastOrder?: string;
  address?: string;
  notes?: string;
  type: 'Bireysel' | 'Kurumsal';
  username: string;
  password: string;
  filamentPrices: FilamentPrice[];
  customerCategory?: 'normal' | 'wholesale';
  discountRate?: number;
}

const DEFAULT_FORM: Partial<Customer> = {
  name: '', phone: '', email: '', company: '', taxNumber: '', address: '',
  type: 'Bireysel', username: '', password: '',
  filamentPrices: [{ type: 'PLA', price: 0 }],
  orders: 0, totalSpent: 0, customerCategory: 'normal', discountRate: 0,
};

export function useCustomersData() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filamentInputs, setFilamentInputs] = useState<FilamentPrice[]>([]);
  const [filamentTypes, setFilamentTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>(DEFAULT_FORM);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/filaments/types');
        if (res.ok) {
          const types = await res.json();
          setFilamentTypes(Array.isArray(types) && types.length > 0 ? types : []);
        } else { setFilamentTypes([]); }
      } catch { setFilamentTypes([]); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true); setError(null);
        const res = await fetch('/api/customers');
        if (!res.ok) throw new Error(`API hatası: ${res.status} ${res.statusText}`);
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Müşteri verileri yüklenirken bir hata oluştu: ' +
          (err instanceof Error ? err.message : 'Bilinmeyen hata'));
        setCustomers([]);
      } finally { setIsLoading(false); }
    })();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    try {
      const s = searchTerm.toLowerCase();
      return (
        customer.name.toLowerCase().includes(s) ||
        customer.email.toLowerCase().includes(s) ||
        (customer.company && customer.company.toLowerCase().includes(s)) ||
        (customer.username && customer.username.toLowerCase().includes(s))
      );
    } catch {
      return false;
    }
  });

  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleFilamentChange = useCallback(
    (index: number, field: 'type' | 'price', value: string) => {
      setFilamentInputs((prev) => {
        const next = [...prev];
        if (field === 'type') {
          next[index].type = value;
        } else {
          next[index].price = parseFloat(value) || 0;
        }
        setFormData((fd) => ({ ...fd, filamentPrices: next }));
        return next;
      });
    },
    [],
  );

  const addFilamentPrice = useCallback(() => {
    const defaultType = filamentTypes.length > 0 ? filamentTypes[0] : '';
    setFilamentInputs((prev) => [...prev, { type: defaultType, price: 0 }]);
  }, [filamentTypes]);

  const removeFilamentPrice = useCallback(
    (index: number) => {
      if (filamentInputs.length <= 1) return;
      setFilamentInputs((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        setFormData((fd) => ({ ...fd, filamentPrices: next }));
        return next;
      });
    },
    [filamentInputs.length],
  );

  const handleAddCustomer = useCallback(() => {
    setSelectedCustomer(null);
    const defaultType = filamentTypes.length > 0 ? filamentTypes[0] : '';
    setFormData({
      ...DEFAULT_FORM,
      filamentPrices: [{ type: defaultType, price: 0 }],
    });
    setFilamentInputs([{ type: defaultType, price: 0 }]);
    setIsModalOpen(true);
  }, [filamentTypes]);

  const handleEditCustomer = useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer);
      const defaultType = filamentTypes.length > 0 ? filamentTypes[0] : '';
      const filamentPrices =
        customer.filamentPrices && customer.filamentPrices.length > 0
          ? customer.filamentPrices
          : [{ type: defaultType, price: 0 }];

      const validated = filamentPrices.map((fp) => {
        if (filamentTypes.length > 0 && !filamentTypes.includes(fp.type)) {
          return { ...fp, type: defaultType };
        }
        return fp;
      });

      setFormData({ ...customer, filamentPrices: validated });
      setFilamentInputs([...validated]);
      setIsModalOpen(true);
    },
    [filamentTypes],
  );

  const handleDeleteCustomer = useCallback(
    async (customerId: string) => {
      const confirmDelete = window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?');
      if (!confirmDelete) return;
      setDeletingCustomerId(customerId);
      try {
        const response = await fetch(`/api/customers?id=${customerId}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const msg = errorData.details?.join(', ') || errorData.error || 'Müşteri silinemedi';
          throw new Error(msg);
        }
        setCustomers((prev) => prev.filter((c) => c.id !== customerId));
        toast.success('Müşteri başarıyla silindi');
      } catch (err) {
        console.error('Müşteri silinirken hata:', err);
        toast.error(err instanceof Error ? err.message : 'Müşteri silinirken bir hata oluştu');
      } finally {
        setDeletingCustomerId(null);
      }
    },
    [toast],
  );

  const handleSaveCustomer = useCallback(async () => {
    if (!formData.name || !formData.username || !formData.password) {
      toast.warning('Lütfen zorunlu alanları doldurun (Ad Soyad, Kullanıcı Adı, Şifre)');
      return;
    }
    if (formData.type === 'Kurumsal' && !formData.taxNumber) {
      toast.warning('Kurumsal müşteriler için vergi numarası zorunludur');
      return;
    }
    if (formData.customerCategory === 'wholesale' && (!formData.discountRate || formData.discountRate <= 0)) {
      toast.warning('Toptancı müşteriler için iskonto oranı girmelisiniz');
      return;
    }

    let filamentPrices: FilamentPrice[];
    if (formData.filamentPrices && Array.isArray(formData.filamentPrices) && formData.filamentPrices.length > 0) {
      filamentPrices = formData.filamentPrices.map((fp) => ({
        type: fp.type || 'PLA',
        price: parseFloat(String(fp.price)) || 0,
      }));
    } else {
      filamentPrices = [{ type: 'PLA', price: 0 }];
    }

    const customerData = {
      name: formData.name, phone: formData.phone, email: formData.email,
      company: formData.company || '', address: formData.address || '',
      notes: formData.notes || '', type: formData.type || 'Bireysel',
      taxNumber: formData.taxNumber || '', username: formData.username,
      password: formData.password, customerCategory: formData.customerCategory || 'normal',
      discountRate: formData.discountRate || 0, filamentPrices,
    };

    setIsSaving(true);
    try {
      if (selectedCustomer) {
        const response = await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedCustomer.id, ...customerData }),
        });
        if (!response.ok) {
          const ed = await response.json().catch(() => ({}));
          throw new Error(ed.details?.join(', ') || ed.error || 'Müşteri güncellenemedi');
        }
        const updated = await response.json();
        setCustomers((prev) => prev.map((c) => (c.id === selectedCustomer.id ? updated : c)));
        toast.success('Müşteri başarıyla güncellendi');
      } else {
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData),
        });
        if (!response.ok) {
          const ed = await response.json().catch(() => ({}));
          throw new Error(ed.details?.join(', ') || ed.error || 'Müşteri eklenemedi');
        }
        const newCustomer = await response.json();
        setCustomers((prev) => [...prev, newCustomer]);
        toast.success('Müşteri başarıyla eklendi');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Müşteri kaydedilirken hata:', err);
      toast.error(err instanceof Error ? err.message : 'Müşteri kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  }, [formData, selectedCustomer, toast]);

  return {
    searchTerm, setSearchTerm, filteredCustomers, isLoading, error,
    isModalOpen, setIsModalOpen, selectedCustomer, formData,
    filamentInputs, filamentTypes, isSaving, deletingCustomerId,
    handleFormChange, handleFilamentChange, addFilamentPrice,
    removeFilamentPrice, handleAddCustomer, handleEditCustomer,
    handleDeleteCustomer, handleSaveCustomer,
  };
}
