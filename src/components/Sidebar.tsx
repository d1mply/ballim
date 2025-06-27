'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  HomeIcon, 
  PackageIcon, 
  ShoppingCartIcon, 
  ClipboardListIcon, 
  UsersIcon, 
  CreditCardIcon, 
  CubeIcon, 
  ReceiptIcon,
  DesktopIcon,
  TruckIcon
} from '../utils/Icons';

type SidebarProps = {
  isOpen?: boolean;
  userType?: 'admin' | 'customer';
  onClose?: () => void;
};

export default function Sidebar({ isOpen = true, userType = 'admin', onClose }: SidebarProps) {
  const pathname = usePathname();

  // Admin için menü öğeleri
  const adminMenuItems = [
    { name: 'Ana Sayfa', path: '/admin-dashboard', icon: <HomeIcon /> },
    { name: 'Ürünler', path: '/urunler', icon: <PackageIcon /> },
    { name: 'Stok ve Sipariş', path: '/stok-siparis', icon: <ShoppingCartIcon /> },
    { name: 'Pazaryeri Siparişleri', path: '/pazaryeri-siparisleri', icon: <TruckIcon /> },
    { name: 'Sipariş Takip', path: '/siparis-takip', icon: <ClipboardListIcon /> },
    { name: 'Müşteriler', path: '/musteriler', icon: <UsersIcon /> },
    { name: 'Cari Hesap', path: '/cari-hesap', icon: <CreditCardIcon /> },
    { name: 'Filamentler', path: '/filamentler', icon: <CubeIcon /> },
    { name: 'Ödemeler', path: '/odemeler', icon: <ReceiptIcon /> },
    { name: 'Üretim Takip', path: '/uretim-takip', icon: <ClipboardListIcon /> },
  ];

  // Müşteri için menü öğeleri
  const customerMenuItems = [
    { name: 'Ana Sayfa', path: '/customer-dashboard', icon: <HomeIcon /> },
    { name: 'Ürünler', path: '/urunler', icon: <PackageIcon /> },
    { name: 'Stok ve Sipariş', path: '/stok-siparis', icon: <ShoppingCartIcon /> },
    { name: 'Sipariş Takip', path: '/siparis-takip', icon: <ClipboardListIcon /> },
    { name: 'Cari Hesap', path: '/cari-hesap', icon: <CreditCardIcon /> },
  ];

  // Kullanıcı tipine göre menüyü belirle
  let menuItems = userType === 'admin' ? adminMenuItems : customerMenuItems;

  // Ana sayfa yönlendirmesini kullanıcı tipine göre ayarla
  const homePath = userType === 'admin' ? '/admin-dashboard' : '/customer-dashboard';

  const handleLinkClick = () => {
    // Mobile'da link tıklandığında sidebar'ı kapat
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <aside className={`ballim-sidebar ${isOpen ? 'open' : ''} shadow-md`}>
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary to-accent">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
            <span className="text-black font-bold text-lg">B</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-black">Ballim</h1>
            <p className="text-xs text-black/80">3D Baskı Sistemi</p>
          </div>
        </div>
      </div>
      <nav className="mt-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            // Ana sayfa için özel yönlendirme
            const itemPath = item.name === 'Ana Sayfa' ? homePath : item.path;
            
            const isActive = pathname === itemPath || 
                           (itemPath !== '/' && pathname.startsWith(itemPath));
            
            return (
              <li key={item.name + item.path} className="px-1">
                <Link
                  href={itemPath}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 px-3 py-3 text-sm rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                      : 'hover:bg-secondary/70 text-foreground/80 hover:text-foreground'
                  }`}
                >
                  <span className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-foreground/70'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-2 h-2 bg-primary-foreground rounded-full opacity-70"></div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
} 