'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 🚀 PERFORMANS: Prefetching Hook - Critical routes'u prefetch et
export function usePrefetchRoutes() {
  const router = useRouter();

  useEffect(() => {
    // Critical routes'u prefetch et (arka planda yükle)
    const criticalRoutes = [
      '/urunler',
      '/musteriler',
      '/siparis-takip',
      '/admin-dashboard',
      '/customer-dashboard',
      '/stok-yonetimi',
      '/filamentler',
    ];

    // Prefetch tüm critical routes
    criticalRoutes.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);
}

// 🚀 PERFORMANS: Hover Prefetch Hook - Link hover'da prefetch
export function usePrefetchOnHover(href: string) {
  const router = useRouter();

  const handleMouseEnter = () => {
    router.prefetch(href);
  };

  return handleMouseEnter;
}
