'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

// Giriş yapan kullanıcı tipi
export interface LoggedInUser {
  id: string;
  username: string;
  name?: string; // Opsiyonel, geriye dönük uyumluluk için
  type: 'admin' | 'customer';
  email?: string; // Customer için
  filamentPrices?: { type: string; price: number }[];
}

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Halihazırda oturum açılmış mı kontrol et
  useEffect(() => {
    const loggedUser = localStorage.getItem('loggedUser');
    if (loggedUser) {
      router.push('/urunler');
    }
  }, [router]);

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
        router.push('/urunler');
      } else {
        router.push('/stok-siparis');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      setError(error instanceof Error ? error.message : 'Giriş yapılırken bir hata oluştu');
      setLoading(false);
    }
  };

  return (
    <Layout hideNavigation>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg p-8 w-full max-w-md shadow-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Ballim</h1>
            <p className="text-muted-foreground mt-2">3D Baskı Yönetim Sistemi</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-danger/10 border border-danger text-danger rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium">
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
              <label htmlFor="password" className="block text-sm font-medium">
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
              className="w-full btn-primary py-3 mt-4"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Müşteri hesabınız ile giriş yapın</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
