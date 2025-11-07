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

  // Otomatik yönlendirme kaldırıldı - kullanıcı manuel giriş yapmalı

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
    
    // Basit validasyon
    if (!username || !password) {
      setError('Lütfen kullanıcı adı ve şifre girin');
      return;
    }
    
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
      
      // Response'u parse et
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Response parse hatası:', parseError);
        setError('Sunucudan geçersiz yanıt alındı');
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        // Hata durumu
        const errorMessage = responseData?.error || `HTTP ${response.status}: Giriş yapılamadı`;
        console.error('Giriş hatası:', errorMessage, responseData);
        setError(errorMessage);
        setLoading(false);
        return;
      }
      
      // Başarılı giriş kontrolü
      if (responseData && responseData.success && responseData.user) {
        const userData = responseData.user;
        console.log('Giriş başarılı:', userData);
        
        // Kullanıcı bilgilerini session'a kaydet
        localStorage.setItem('loggedUser', JSON.stringify(userData));
        
        // Direkt ürünler sayfasına yönlendir
        window.location.href = '/urunler';
      } else {
        console.error('Geçersiz response:', responseData);
        setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        setLoading(false);
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

        {/* Ana içerik alanı */}
        <div className="relative z-10 flex min-h-screen p-4 md:p-6 lg:p-10 items-start justify-between pointer-events-none">
          
          {/* Sol taraf - Kataloglar ve Satış Noktaları (3D yazıcıların olduğu alan) */}
          <div className="hidden lg:block pointer-events-auto w-1/2 pr-8 space-y-6">
            
            {/* Kataloglar */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/30 p-8 shadow-2xl">
              <h3 className="text-white font-bold text-2xl mb-6 text-center tracking-wide flex items-center justify-center gap-3">
                <span className="text-3xl">📖</span>
                Kataloglarımız
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {catalogs.map((catalog, index) => (
                  <a
                    key={index}
                    href={`/kataloglar/${catalog.file}`}
                    target="_blank"
                    className="group bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg rounded-xl border border-white/40 p-4 hover:from-white/30 hover:to-white/20 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:from-blue-500/40 group-hover:to-purple-500/40 transition-all duration-300 shadow-lg">
                        <span className="text-white text-xl">📄</span>
                      </div>
                      <h4 className="text-white font-bold text-sm mb-2 group-hover:text-blue-200 transition-colors leading-tight">{catalog.name}</h4>
                      <p className="text-white/80 text-xs leading-relaxed group-hover:text-white/90 transition-colors">{catalog.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            
            {/* Satış Noktaları */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/30 p-6 shadow-2xl">
              <h3 className="text-white font-bold text-xl mb-4 text-center tracking-wide flex items-center justify-center gap-2">
                <span className="text-2xl">🏪</span>
                Satış Noktalarımız
              </h3>
              
              <div className="flex flex-wrap gap-3 justify-center">
                {salesPoints.map((point, index) => {
                  let displayName = resolvedNames[point.url || ''] || point.name;
                  // Google Haritalar/Maps gibi başlıklar geldiyse kendi ismimizi kullan
                  if (displayName && /google\s*(maps|haritalar)/i.test(displayName)) {
                    displayName = point.name;
                  }
                  return (
                    <a
                      key={index}
                      href={point.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-green-200 px-4 py-2 rounded-full text-sm font-medium hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                    >
                      {displayName}
                    </a>
                  );
                })}
              </div>
              
              <p className="text-white/60 text-center mt-3 text-sm">
                {salesPoints.length}+ iş ortağı
              </p>
            </div>
          </div>
          
          {/* Sağ taraf - Login kutusu */}
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
          
          {/* Mobil için kataloglar ve satış noktaları - alt kısımda */}
          <div className="lg:hidden mt-8 pt-6 border-t border-white/30 space-y-6">
            
            {/* Kataloglar */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4 text-center tracking-wide">📖 Kataloglarımız</h3>
            
              <div className="overflow-x-auto pb-4">
              <div className="flex space-x-4 min-w-max px-1">
                {catalogs.map((catalog, index) => (
                  <a
                    key={index}
                    href={`/kataloglar/${catalog.file}`}
                    target="_blank"
                      className="group bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-lg rounded-xl border border-white/30 p-4 min-w-[160px] hover:from-white/25 hover:to-white/10 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <div className="text-center">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-500/30 transition-colors">
                          <span className="text-blue-300 text-lg">📄</span>
                      </div>
                        <h4 className="text-white font-semibold text-xs mb-1 leading-tight">{catalog.name}</h4>
                      <p className="text-white/70 text-xs leading-relaxed">{catalog.description}</p>
                    </div>
                  </a>
                ))}
                </div>
              </div>
            </div>
            
            {/* Satış Noktaları */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4 text-center tracking-wide">🏪 Satış Noktalarımız</h3>
              
              <div className="flex flex-wrap gap-2 justify-center">
                {salesPoints.map((point, index) => {
                  let displayName = resolvedNames[point.url || ''] || point.name;
                // Google Haritalar/Maps gibi başlıklar geldiyse kendi ismimizi kullan
                if (displayName && /google\s*(maps|haritalar)/i.test(displayName)) {
                    displayName = point.name;
                }
                return (
                  <a
                      key={index}
                      href={point.url}
                    target="_blank"
                    rel="noopener noreferrer"
                      className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-green-200 px-3 py-2 rounded-full text-xs font-medium hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50 transition-all duration-300 transform hover:scale-105"
                  >
                      {displayName}
                  </a>
                );
              })}
              </div>
              
              <p className="text-white/60 text-center mt-3 text-xs">
                {salesPoints.length}+ iş ortağı
              </p>
            </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
