'use client';

import { useEffect } from 'react';

// 🚀 PERFORMANS: DNS Prefetch ve Resource Hints Component
export default function PerformanceHints() {
  useEffect(() => {
    // DNS Prefetch için link elementleri ekle
    const addResourceHint = (rel: string, href: string, attributes?: Record<string, string>) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      Object.entries(attributes || {}).forEach(([key, value]) => {
        link.setAttribute(key, value);
      });
      document.head.appendChild(link);
    };

    // DNS Prefetch - External domains
    addResourceHint('dns-prefetch', 'https://fonts.googleapis.com');
    addResourceHint('dns-prefetch', 'https://fonts.gstatic.com');

    // Preconnect - Critical external resources
    addResourceHint('preconnect', 'https://fonts.googleapis.com', { crossOrigin: 'anonymous' });
    addResourceHint('preconnect', 'https://fonts.gstatic.com', { crossOrigin: 'anonymous' });

    return () => {
      // Cleanup (optional, but good practice)
      document.head.querySelectorAll('link[rel="dns-prefetch"], link[rel="preconnect"]').forEach(link => {
        if (link.getAttribute('href')?.includes('fonts.googleapis.com') || 
            link.getAttribute('href')?.includes('fonts.gstatic.com')) {
          link.remove();
        }
      });
    };
  }, []);

  return null; // Bu component render etmez, sadece side effect çalıştırır
}
