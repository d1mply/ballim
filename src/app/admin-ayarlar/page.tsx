'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import { Icons } from '../../utils/Icons';

interface User {
  id: string;
  name: string;
  type: 'admin' | 'customer';
}

interface SettingMeta {
  key: string;
  value: any;
  type: string;
  category: string;
  description: string;
  isPublic: boolean;
}

interface SettingsResponse {
  settings: Record<string, any>;
  metadata: SettingMeta[];
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

// Kategori başlıkları
const categoryTitles: Record<string, string> = {
  general: 'Genel Ayarlar',
  categories: 'Kategori Ayarları',
  orders: 'Sipariş Ayarları',
  notifications: 'Bildirim Ayarları',
};

// Kategori ikonları
const categoryIcons: Record<string, React.ReactNode> = {
  general: <Icons.SettingsIcon className="h-5 w-5" />,
  categories: <Icons.TagIcon className="h-5 w-5" />,
  orders: <Icons.ClipboardIcon className="h-5 w-5" />,
  notifications: <Icons.BellIcon className="h-5 w-5" />,
};

export default function AdminAyarlarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Ürün kategorilerini al
  const { data: products } = useSWR('/api/products', fetcher);
  
  useEffect(() => {
    if (products && Array.isArray(products)) {
      const uniqueCategories = Array.from(new Set(products.map((p: any) => p.productType).filter(Boolean)));
      setCategories(uniqueCategories as string[]);
    }
  }, [products]);

  // Settings API'den ayarları al
  const { data: settingsData, error: settingsError, mutate } = useSWR<SettingsResponse>(
    '/api/settings?all=true',
    fetcher,
    { revalidateOnFocus: false }
  );

  // Kullanıcı kontrolü
  useEffect(() => {
    const loggedUserJson = localStorage.getItem('loggedUser');
    if (loggedUserJson) {
      try {
        const userData = JSON.parse(loggedUserJson) as User;
        setUser(userData);
        if (userData.type !== 'admin') {
          router.push('/');
        }
      } catch {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  // Ayarları local state'e yükle
  useEffect(() => {
    if (settingsData?.settings) {
      setLocalSettings(settingsData.settings);
    }
  }, [settingsData]);

  // Ayar değiştir
  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  // Kategori gizle/göster toggle
  const toggleHiddenCategory = (category: string) => {
    const hidden = localSettings.hidden_categories || [];
    const newHidden = hidden.includes(category)
      ? hidden.filter((c: string) => c !== category)
      : [...hidden, category];
    handleSettingChange('hidden_categories', newHidden);
  };

  // Ayarları kaydet
  const saveSettings = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: localSettings }),
      });
      
      if (!response.ok) {
        throw new Error('Ayarlar kaydedilemedi');
      }
      
      await mutate();
      setSaveMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi!' });
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Ayarlar kaydedilemedi. Lütfen tekrar deneyin.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Admin kontrolü
  if (user?.type !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Icons.SettingsIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Yetkisiz Erişim</h2>
          <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </Layout>
    );
  }

  if (settingsError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Icons.AlertCircleIcon className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Hata</h2>
          <p className="text-muted-foreground">Ayarlar yüklenemedi. Lütfen sayfayı yenileyin.</p>
        </div>
      </Layout>
    );
  }

  if (!settingsData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Yükleniyor...</span>
        </div>
      </Layout>
    );
  }

  // Ayarları kategorilere göre grupla
  const groupedSettings = settingsData.metadata.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SettingMeta[]>);

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sistem Ayarları</h1>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Icons.SaveIcon className="h-4 w-4" />
            )}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        {saveMessage && (
          <div className={`p-4 rounded-lg ${
            saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {saveMessage.text}
          </div>
        )}

        {/* Genel Ayarlar */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            {categoryIcons.general}
            <h2 className="text-lg font-semibold">{categoryTitles.general}</h2>
          </div>
          
          <div className="space-y-4">
            {/* Bakım Modu */}
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Bakım Modu</p>
                <p className="text-sm text-muted-foreground">Aktifken site bakım mesajı gösterir</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.maintenance_mode || false}
                  onChange={(e) => handleSettingChange('maintenance_mode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Bakım Mesajı */}
            {localSettings.maintenance_mode && (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <label className="block font-medium mb-2">Bakım Mesajı</label>
                <input
                  type="text"
                  value={localSettings.maintenance_message || ''}
                  onChange={(e) => handleSettingChange('maintenance_message', e.target.value)}
                  className="w-full"
                  placeholder="Bakım mesajını girin..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Kategori Ayarları */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            {categoryIcons.categories}
            <h2 className="text-lg font-semibold">{categoryTitles.categories}</h2>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Seçilen kategoriler admin dışındaki kullanıcılara gösterilmez.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((category) => {
              const isHidden = (localSettings.hidden_categories || []).includes(category);
              return (
                <button
                  key={category}
                  onClick={() => toggleHiddenCategory(category)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    isHidden 
                      ? 'bg-red-100 border-red-300 text-red-800' 
                      : 'bg-secondary/50 border-border hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category}</span>
                    {isHidden ? (
                      <Icons.EyeOffIcon className="h-4 w-4" />
                    ) : (
                      <Icons.EyeIcon className="h-4 w-4" />
                    )}
                  </div>
                  <p className="text-xs mt-1">
                    {isHidden ? 'Gizli (sadece admin görür)' : 'Herkese görünür'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sipariş Ayarları */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            {categoryIcons.orders}
            <h2 className="text-lg font-semibold">{categoryTitles.orders}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <label className="block font-medium mb-2">Minimum Sipariş Tutarı (TL)</label>
              <input
                type="number"
                value={localSettings.min_order_amount || 0}
                onChange={(e) => handleSettingChange('min_order_amount', Number(e.target.value))}
                className="w-full"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">0 = Limit yok</p>
            </div>
            
            <div className="p-4 bg-secondary/50 rounded-lg">
              <label className="block font-medium mb-2">Ücretsiz Kargo Limiti (TL)</label>
              <input
                type="number"
                value={localSettings.free_shipping_limit || 0}
                onChange={(e) => handleSettingChange('free_shipping_limit', Number(e.target.value))}
                className="w-full"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Bu tutarın üstünde kargo ücretsiz</p>
            </div>
          </div>
        </div>

        {/* Bildirim Ayarları */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            {categoryIcons.notifications}
            <h2 className="text-lg font-semibold">{categoryTitles.notifications}</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Sipariş Bildirimleri</p>
                <p className="text-sm text-muted-foreground">Yeni sipariş geldiğinde bildirim gönder</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.order_notifications_enabled || false}
                  onChange={(e) => handleSettingChange('order_notifications_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div className="p-4 bg-secondary/50 rounded-lg">
              <label className="block font-medium mb-2">Düşük Stok Uyarı Eşiği</label>
              <input
                type="number"
                value={localSettings.low_stock_threshold || 5}
                onChange={(e) => handleSettingChange('low_stock_threshold', Number(e.target.value))}
                className="w-full"
                min="1"
              />
              <p className="text-xs text-muted-foreground mt-1">Stok bu sayının altına düşünce uyarı</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
