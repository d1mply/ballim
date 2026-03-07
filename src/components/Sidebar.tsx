'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home as HomeIcon, 
  Package as PackageIcon, 
  ShoppingCart as ShoppingCartIcon, 
  ClipboardList as ClipboardListIcon, 
  Users as UsersIcon, 
  CreditCard as CreditCardIcon, 
  Box as CubeIcon, 
  Receipt as ReceiptIcon,
  Truck as TruckIcon,
  Calculator as CalculatorIcon,
  Warehouse as WarehouseIcon,
  PackageCheck as PackageCheckIcon,
  Settings as SettingsIcon
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { hasPermission } from '@/lib/permissions';
import { MENU_PERMISSIONS } from '@/lib/permissions';

type SidebarProps = {
  isOpen?: boolean;
  userType?: 'admin' | 'customer';
  onClose?: () => void;
};

const ADMIN_MENU_ITEMS = [
  { name: 'Ana Sayfa', path: '/admin-dashboard', icon: <HomeIcon />, permission: null as string | null },
  { name: 'Teklif Hesaplama', path: '/teklif', icon: <CalculatorIcon />, permission: MENU_PERMISSIONS.products },
  { name: 'Ürünler', path: '/urunler', icon: <PackageIcon />, permission: MENU_PERMISSIONS.products },
  { name: 'Stok Yönetimi', path: '/stok-yonetimi', icon: <WarehouseIcon />, permission: MENU_PERMISSIONS.inventory },
  { name: 'Stok Üretim', path: '/stok-uretim', icon: <PackageCheckIcon />, permission: MENU_PERMISSIONS.inventory },
  { name: 'Stok ve Sipariş', path: '/stok-siparis', icon: <ShoppingCartIcon />, permission: MENU_PERMISSIONS.inventory },
  { name: 'Pazaryeri Siparişleri', path: '/pazaryeri-siparisleri', icon: <TruckIcon />, permission: MENU_PERMISSIONS.orders },
  { name: 'Sipariş Takip', path: '/siparis-takip', icon: <ClipboardListIcon />, permission: MENU_PERMISSIONS.orders },
  { name: 'Müşteriler', path: '/musteriler', icon: <UsersIcon />, permission: MENU_PERMISSIONS.customers },
  { name: 'Cari Hesap', path: '/cari-hesap', icon: <CreditCardIcon />, permission: MENU_PERMISSIONS.payments },
  { name: 'Filamentler', path: '/filamentler', icon: <CubeIcon />, permission: MENU_PERMISSIONS.filaments },
  { name: 'Ödemeler', path: '/odemeler', icon: <ReceiptIcon />, permission: MENU_PERMISSIONS.payments },
  { name: 'Üretim Takip', path: '/uretim-takip', icon: <ClipboardListIcon />, permission: MENU_PERMISSIONS.orders },
  { name: 'Audit Log', path: '/audit-log', icon: <ClipboardListIcon />, permission: MENU_PERMISSIONS.reports },
  { name: 'Ayarlar', path: '/admin-ayarlar', icon: <SettingsIcon />, permission: MENU_PERMISSIONS.settings },
];

const CUSTOMER_MENU_ITEMS = [
  { name: 'Ana Sayfa', path: '/customer-dashboard', icon: <HomeIcon /> },
  { name: 'Sipariş Takip', path: '/siparis-takip', icon: <ClipboardListIcon /> },
  { name: 'Ürünler', path: '/urunler', icon: <PackageIcon /> },
  { name: 'Cari Hesap', path: '/cari-hesap', icon: <CreditCardIcon /> },
];

export default function Sidebar({ isOpen = true, userType = 'admin', onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = usePermissions();

  const menuItems = React.useMemo(() => {
    const effectiveType = user?.type ?? userType;
    if (effectiveType === 'customer') {
      return CUSTOMER_MENU_ITEMS;
    }
    if (user?.permissions && !user.permissions.includes('*')) {
      const authUser = {
        id: user.id,
        username: user.username ?? user.name ?? '',
        role: user.role ?? 'admin',
        permissions: user.permissions,
      };
      return ADMIN_MENU_ITEMS.filter(
        (item) => !item.permission || hasPermission(authUser, item.permission)
      );
    }
    return ADMIN_MENU_ITEMS.map(({ permission, ...rest }) => rest);
  }, [user, userType]);

  const effectiveType = user?.type ?? userType;
  const homePath = effectiveType === 'admin' ? '/admin-dashboard' : '/customer-dashboard';

  const handleLinkClick = () => {
    // Mobile'da link tıklandığında sidebar'ı kapat
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <aside 
      className={`ballim-sidebar ${isOpen ? 'open' : ''} shadow-md`}
      role="complementary"
      aria-label="Ana navigasyon"
    >
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary to-accent">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
            <span className="text-black font-bold text-lg" aria-hidden="true">B</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-black">Ballim</h1>
            <p className="text-xs text-black/80">3D Baskı Sistemi</p>
          </div>
        </div>
      </div>
      <nav className="mt-2" role="navigation" aria-label="Ana menü">
        <ul className="space-y-1" role="menubar">
          {menuItems.map((item) => {
            // Ana sayfa için özel yönlendirme
            const itemPath = item.name === 'Ana Sayfa' ? homePath : item.path;
            
            const isActive = pathname === itemPath || 
                           (itemPath !== '/' && pathname.startsWith(itemPath));
            
            return (
              <li key={item.name + item.path} className="px-1" role="none">
                <Link
                  href={itemPath}
                  prefetch={true}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  onMouseEnter={() => {
                    // 🚀 PERFORMANS: Hover prefetch (client-side only)
                    if (typeof window !== 'undefined') {
                      router.prefetch(itemPath);
                    }
                  }}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 px-3 py-3 text-sm rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                      : 'hover:bg-secondary/70 text-foreground/80 hover:text-foreground'
                  }`}
                >
                  <span className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-foreground/70'}`} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-2 h-2 bg-primary-foreground rounded-full opacity-70" aria-hidden="true"></div>
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