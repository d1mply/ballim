'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import { salesPoints } from '../config/salesPoints';

// Giriş yapan kullanıcı tipi
export interface LoggedInUser {
  id: string;
  username: string;
  name?: string; // Opsiyonel, geriye dönük uyumluluk için
  type: 'admin' | 'customer';
  email?: string; // Customer için
  customerCategory?: 'normal' | 'wholesale'; // Müşteri kategorisi
  discountRate?: number; // Toptancı iskonto oranı
  filamentPrices?: { type: string; price: number }[];
}

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Arka plan görselleri
  const desktopBg = '/login-bg-desktop.webp';
  const mobileBg = '/login-bg-mobile.webp';
  
  // Katalog listesi
  const catalogs = [
    { name: 'Book Nook Katalog', file: 'Book Nook Katalog.pdf', description: 'Kitap köşesi tasarımları' },
    { name: 'F1 Katalog', file: 'F1 KATALOG.pdf', description: 'Formula 1 ürünleri' },
    { name: 'Uludağ Anahtarlık 1', file: 'ULUDAG ANAHTARLIK KATOLOG1.pdf', description: 'Anahtarlık koleksiyonu' },
    { name: 'Uludağ Anahtarlık 2', file: 'ULUDAG ANAHTARLIK KATOLOG2.pdf', description: 'Anahtarlık koleksiyonu' },
    { name: 'Uludağ Anahtarlık 3', file: 'ULUDAG ANAHTARLIK KATOLOG3.pdf', description: 'Anahtarlık koleksiyonu' }
  ];

  // Halihazırda oturum açılmış mı kontrol et
  useEffect(() => {
    const loggedUser = localStorage.getItem('loggedUser');
    if (loggedUser) {
      router.push('/urunler');
    }
  }, [router]);

  // Ekran genişliğine göre arka plan seçimi
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Harita linklerinden isimleri çöz (opsiyonel)
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const run = async () => {
      const pairs = await Promise.all(
        salesPoints.map(async (sp) => {
          if (!sp.url) return [sp.url || '', sp.name] as const;
          try {
            const r = await fetch(`/api/salespoint-meta?url=${encodeURIComponent(sp.url)}`);
            if (!r.ok) return [sp.url, sp.name] as const;
            const d = await r.json();
            return [sp.url, d.name || sp.name] as const;
          } catch {
            return [sp.url, sp.name] as const;
          }
        })
      );
      const map: Record<string, string> = {};
      for (const [u, n] of pairs) if (u) map[u] = n;
      setResolvedNames(map);
    };
    run();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // API'den kullanıcı bilgilerini al
      // Admin mi customer mı otomatik tespit et
      const userType = username === 'admin' ? 'admin' : 'customer';
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password, 
          type: userType,
          honeypot: '' // Bot koruması için
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Giriş yapılırken bir hata oluştu');
      }
      
      const responseData = await response.json();
      
      // Yeni API response formatına uygun
      const userData = responseData.user || responseData;
      
      // Kullanıcı bilgilerini session'a kaydet
      localStorage.setItem('loggedUser', JSON.stringify(userData));
      
      // Kullanıcı tipine göre yönlendir
      if (userData.type === 'admin') {
        router.push('/admin-dashboard');
      } else {
        router.push('/customer-dashboard');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      setError(error instanceof Error ? error.message : 'Giriş yapılırken bir hata oluştu');
      setLoading(false);
    }
  };

  return (
    <Layout hideNavigation>
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: `url(${isMobile ? mobileBg : desktopBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-black/50" />

        {/* Sağ üstte login kutusu (mobilde ortalanır) */}
        <div className="relative z-10 flex min-h-screen p-4 md:p-6 lg:p-10 items-start justify-center md:justify-end pointer-events-none">
          <div className="pointer-events-auto bg-neutral-900/85 text-white backdrop-blur-sm border border-white/10 rounded-xl p-5 md:p-7 w-full max-w-md shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow">Ballim</h1>
            <p className="text-sm text-white/80 mt-1">3D Baskı Yönetim Sistemi</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-danger/10 border border-danger text-danger rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-white/90">
                Kullanıcı Adı
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-white/90">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full btn-primary py-3 mt-2"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
          
          <div className="mt-4 text-center text-xs md:text-sm text-white/70">
            <p>Müşteri hesabınız ile giriş yapın</p>
          </div>
          
          {/* Kataloglarımız */}
          <div className="mt-8 pt-6 border-t border-white/30">
            <h3 className="text-white font-bold text-lg mb-6 text-center tracking-wide">📖 Kataloglarımız</h3>
            
            {/* Mobil: Horizontal Scroll */}
            <div className="md:hidden overflow-x-auto pb-4">
              <div className="flex space-x-4 min-w-max px-1">
                {catalogs.map((catalog, index) => (
                  <a
                    key={index}
                    href={`/kataloglar/${catalog.file}`}
                    target="_blank"
                    className="group bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-lg rounded-xl border border-white/30 p-4 min-w-[180px] hover:from-white/25 hover:to-white/10 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-500/30 transition-colors">
                        <span className="text-blue-300 text-xl">📄</span>
                      </div>
                      <h4 className="text-white font-semibold text-sm mb-2 leading-tight">{catalog.name}</h4>
                      <p className="text-white/70 text-xs leading-relaxed">{catalog.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            
            {/* Masaüstü: Grid Layout */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogs.map((catalog, index) => (
                <a
                  key={index}
                  href={`/kataloglar/${catalog.file}`}
                  target="_blank"
                  className="group bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-lg rounded-xl border border-white/30 p-6 hover:from-white/25 hover:to-white/10 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                      <span className="text-blue-300 text-2xl">📄</span>
                    </div>
                    <h4 className="text-white font-semibold text-base mb-3">{catalog.name}</h4>
                    <p className="text-white/70 text-sm leading-relaxed">{catalog.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Satış Noktalarımız */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 md:left-8 md:right-auto md:max-w-3xl z-10">
          <div className="bg-black/40 text-white backdrop-blur rounded-xl border border-white/10 p-3 md:p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base md:text-lg font-semibold">Satış Noktalarımız</h2>
              <span className="text-xs md:text-sm opacity-80">{salesPoints.length}+ iş ortağı</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
              {salesPoints.map((sp, idx) => {
                let displayName = (sp.url && resolvedNames[sp.url]) ? resolvedNames[sp.url] : sp.name;
                // Google Haritalar/Maps gibi başlıklar geldiyse kendi ismimizi kullan
                if (displayName && /google\s*(maps|haritalar)/i.test(displayName)) {
                  displayName = sp.name;
                }
                return (
                  <a
                    key={`${sp.name}-${idx}`}
                    href={sp.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={displayName}
                    title={displayName}
                    className="pointer-events-auto flex items-center text-xs md:text-sm px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg border border-white/10 truncate transition-colors"
                  >
                    <span className="truncate">{displayName}{sp.city ? ` - ${sp.city}` : ''}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
