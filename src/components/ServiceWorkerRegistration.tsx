'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../lib/service-worker-registration';

// 🚀 PERFORMANS: Service Worker Registration Component
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Only register in production
      if (process.env.NODE_ENV === 'production') {
        registerServiceWorker();
      }
    }
  }, []);

  return null; // Bu component render etmez, sadece side effect çalıştırır
}
