// 🚀 PERFORMANS: Performance Monitoring - Web Vitals & Metrics
export interface WebVitals {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// Web Vitals metriği gönder (analytics servisine)
export function reportWebVitals(metric: WebVitals) {
  // Console'a log (development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
  }

  // Production'da analytics servisine gönder (optional)
  if (process.env.NODE_ENV === 'production') {
    // Örnek: Google Analytics, Vercel Analytics, vs.
    // gtag('event', metric.name, {
    //   value: Math.round(metric.value),
    //   metric_id: metric.id,
    //   metric_value: metric.value,
    //   metric_delta: metric.delta,
    // });
  }

  // Local storage'a kaydet (trend analizi için)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('web-vitals');
      const metrics = stored ? JSON.parse(stored) : [];
      metrics.push({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
      });
      // Son 100 metrik tut
      if (metrics.length > 100) {
        metrics.shift();
      }
      localStorage.setItem('web-vitals', JSON.stringify(metrics));
    } catch (error) {
      console.error('[Performance Monitoring] LocalStorage error:', error);
    }
  }
}

// Performance API'den metrikleri topla
export function measurePerformance() {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return;
  }

  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics = {
      // Time to First Byte (TTFB)
      ttfb: navigation.responseStart - navigation.requestStart,
      
      // First Contentful Paint (FCP)
      fcp: 0, // Bu Web Vitals API'den gelecek
      
      // Largest Contentful Paint (LCP)
      lcp: 0, // Bu Web Vitals API'den gelecek
      
      // Total Blocking Time (TBT)
      tbt: 0,
      
      // Cumulative Layout Shift (CLS)
      cls: 0, // Bu Web Vitals API'den gelecek
      
      // First Input Delay (FID)
      fid: 0, // Bu Web Vitals API'den gelecek
      
      // DOM Content Loaded
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      
      // Load Time
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      
      // Total Page Load Time
      totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
    };

    // Log metrics
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance Metrics]', metrics);
    }

    return metrics;
  } catch (error) {
    console.error('[Performance Monitoring] Error:', error);
  }
}

// Error tracking
export function trackError(error: Error, context?: Record<string, any>) {
  console.error('[Error Tracking]', error, context);

  // Production'da error tracking servisine gönder (optional)
  if (process.env.NODE_ENV === 'production') {
    // Örnek: Sentry, LogRocket, vs.
    // Sentry.captureException(error, { extra: context });
  }

  // Local storage'a kaydet
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('errors');
      const errors = stored ? JSON.parse(stored) : [];
      errors.push({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: Date.now(),
      });
      // Son 50 hata tut
      if (errors.length > 50) {
        errors.shift();
      }
      localStorage.setItem('errors', JSON.stringify(errors));
    } catch (e) {
      console.error('[Error Tracking] LocalStorage error:', e);
    }
  }
}

// Performance monitoring başlat
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') {
    return;
  }

  // Web Vitals'i dinle
  if (typeof window !== 'undefined') {
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(reportWebVitals);
      onFID(reportWebVitals);
      onFCP(reportWebVitals);
      onLCP(reportWebVitals);
      onTTFB(reportWebVitals);
      onINP(reportWebVitals);
    }).catch((error) => {
      console.error('[Performance Monitoring] Web Vitals import error:', error);
    });
  }

  // Global error handler
  window.addEventListener('error', (event) => {
    trackError(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    trackError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { type: 'unhandledRejection' }
    );
  });

  // Page load sonrası metrikleri ölç
  if (document.readyState === 'complete') {
    setTimeout(measurePerformance, 1000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(measurePerformance, 1000);
    });
  }
}
