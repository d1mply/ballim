'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '../lib/performance-monitoring';

// 🚀 PERFORMANS: Performance Monitoring Component
export default function PerformanceMonitoring() {
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  return null; // Bu component render etmez, sadece side effect çalıştırır
}
