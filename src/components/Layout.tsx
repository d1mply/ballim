'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { LoggedInUser } from '../app/page';
import { Icons } from '../utils/Icons';

type LayoutProps = {
  children: React.ReactNode;
  hideNavigation?: boolean;
};

export default function Layout({ children, hideNavigation = false }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Kullanıcı giriş bilgisini kontrol et
    const loggedUserJson = localStorage.getItem('loggedUser');
    
    if (loggedUserJson) {
      const user = JSON.parse(loggedUserJson);
      setCurrentUser(user);
    } else if (!hideNavigation) {
      // Giriş yapılmamışsa ve navigasyon gösterilecekse giriş sayfasına yönlendir
      router.push('/');
    }
  }, [hideNavigation, router]);

  const handleLogout = () => {
    localStorage.removeItem('loggedUser');
    setCurrentUser(null);
    router.push('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`flex flex-col min-h-screen ${hideNavigation ? 'bg-transparent' : 'bg-background'}`}>
      {/* Üst menü barı */}
      {!hideNavigation && currentUser && (
        <header className="fixed top-0 left-0 right-0 w-full bg-primary text-primary-foreground shadow-md z-20" style={{backgroundColor: 'var(--primary)'}}>
          <div className="w-full px-4 flex justify-between items-center h-14">
            {/* Mobile menü butonu */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-primary-foreground/20 rounded-md transition-colors"
              aria-label="Menüyü aç/kapat"
            >
              {sidebarOpen ? <Icons.XIcon className="w-5 h-5" /> : <Icons.MenuIcon className="w-5 h-5" />}
            </button>
            
            <div className="font-bold text-lg">Ballim</div>
            
            <div className="flex items-center gap-3">
              {/* Mobile'da kullanıcı bilgilerini gizle */}
              <div className="hidden md:flex items-center rounded-full bg-primary-foreground/10 p-1 pr-4">
                <div className="flex items-center justify-center rounded-full bg-primary-foreground/20 w-8 h-8 mr-2">
                  <span className="text-sm">{(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">{currentUser.name || currentUser.username || 'Kullanıcı'}</div>
                  <div className="text-xs opacity-80">
                    {currentUser.type === 'admin' ? 'Administrator' : 
                     currentUser.customerCategory === 'wholesale' ? 'Toptancı' : 'Müşteri'}
                  </div>
                </div>
              </div>
              
              {/* Mobile'da sadece avatar göster */}
              <div className="md:hidden flex items-center justify-center rounded-full bg-primary-foreground/20 w-8 h-8">
                <span className="text-sm">{(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}</span>
              </div>
              
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-primary-foreground/20 text-sm rounded-md transition-colors"
                title="Çıkış Yap"
              >
                <Icons.LogOutIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Çıkış Yap</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <div className={`flex flex-1 ${hideNavigation ? 'pt-0' : 'pt-14'}`}>
        {!hideNavigation && (
          <Sidebar isOpen={sidebarOpen} userType={currentUser?.type} onClose={() => setSidebarOpen(false)} />
        )}
        
        <main className={`ballim-content w-full ${hideNavigation ? 'pl-0' : ''}`}>
          <div className={`w-full max-w-full h-full ${hideNavigation ? 'p-0' : 'p-4'}`}>
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-10 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
} 