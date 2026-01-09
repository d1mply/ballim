import { SWRConfiguration } from 'swr';

// 🚀 PERFORMANS: Global SWR Configuration
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Window focus'ta revalidate yapma (performans için)
  revalidateOnReconnect: true, // Network reconnect'te revalidate yap
  dedupingInterval: 2000, // 2 saniye içinde duplicate istekleri önle
  refreshInterval: 0, // Otomatik refresh yok (manuel revalidation)
  errorRetryCount: 3, // Hata durumunda 3 kez tekrar dene
  errorRetryInterval: 5000, // Retry aralığı: 5 saniye
  shouldRetryOnError: (error) => {
    // 4xx hatalarında retry yapma (client error)
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    // 5xx hatalarında retry yap (server error)
    return true;
  },
  onError: (error) => {
    console.error('SWR Error:', error);
  },
  // Fetcher function
  fetcher: async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const error: any = new Error('An error occurred while fetching the data.');
      error.status = res.status;
      error.info = await res.json().catch(() => ({}));
      throw error;
    }
    return res.json();
  },
};

// SWR hook'ları için helper fonksiyonlar
export function useProducts() {
  const { data, error, isLoading, mutate } = require('swr')('/api/products', swrConfig.fetcher, swrConfig);
  return { products: data || [], error, isLoading, mutate };
}

export function useCustomers() {
  const { data, error, isLoading, mutate } = require('swr')('/api/customers', swrConfig.fetcher, swrConfig);
  return { customers: data || [], error, isLoading, mutate };
}

export function usePackages() {
  const { data, error, isLoading, mutate } = require('swr')('/api/packages?includeItems=true', swrConfig.fetcher, swrConfig);
  return { packages: data || [], error, isLoading, mutate };
}

export function useDashboardStats() {
  const { data, error, isLoading, mutate } = require('swr')('/api/dashboard-stats', swrConfig.fetcher, {
    ...swrConfig,
    refreshInterval: 60000, // 1 dakikada bir refresh (stats için)
  });
  return { stats: data || {}, error, isLoading, mutate };
}
