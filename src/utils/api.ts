// API yardımcı fonksiyonları - Clean Code için API utilities

import { ApiResponse } from '@/types';

// CSRF Token cache
let csrfToken: string | null = null;
let csrfTokenExpiry: number = 0;

/**
 * API response'u standart formatta döndürür
 */
export const createApiResponse = <T>(
  data?: T,
  message?: string,
  success: boolean = true
): ApiResponse<T> => {
  return {
    success,
    data,
    message,
    ...(success ? {} : { error: message })
  };
};

/**
 * API error response'u oluşturur
 */
export const createApiError = (message: string, status: number = 400): Response => {
  return new Response(
    JSON.stringify(createApiResponse(null, message, false)),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

/**
 * API success response'u oluşturur
 */
export const createApiSuccess = <T>(data: T, message?: string): Response => {
  return new Response(
    JSON.stringify(createApiResponse(data, message, true)),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

/**
 * Get CSRF token from server
 */
export const getCSRFToken = async (): Promise<string | null> => {
  // Return cached token if still valid (with 5 min buffer)
  if (csrfToken && Date.now() < csrfTokenExpiry - 300000) {
    return csrfToken;
  }

  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      // If not authenticated, return null (no CSRF needed for public endpoints)
      if (response.status === 401) {
        return null;
      }
      console.warn('Failed to fetch CSRF token:', response.status);
      return null;
    }

    const data = await response.json();
    csrfToken = data.csrfToken;
    csrfTokenExpiry = Date.now() + 3600000; // 1 hour
    return csrfToken;
  } catch (error) {
    console.warn('CSRF token fetch error:', error);
    return null;
  }
};

/**
 * Clear cached CSRF token (call on logout)
 */
export const clearCSRFToken = (): void => {
  csrfToken = null;
  csrfTokenExpiry = 0;
};

/**
 * Fetch API wrapper - error handling ile ve CSRF desteği
 */
export const apiRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add CSRF token for state-changing requests
    const method = options.method?.toUpperCase() || 'GET';
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const token = await getCSRFToken();
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }

    const response = await fetch(url, {
      credentials: 'include', // Include cookies for auth
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return createApiResponse(null, data.error || 'API Hatası', false);
    }

    return createApiResponse(data, 'Başarılı', true);
  } catch (error) {
    console.error('API Request Error:', error);
    return createApiResponse(
      null, 
      error instanceof Error ? error.message : 'Bilinmeyen hata', 
      false
    );
  }
};

/**
 * POST request helper
 */
export const apiPost = async <T, B = Record<string, unknown>>(
  url: string,
  body: B
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(url, {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

/**
 * PUT request helper
 */
export const apiPut = async <T, B = Record<string, unknown>>(
  url: string,
  body: B
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
};

/**
 * GET request helper
 */
export const apiGet = async <T>(url: string): Promise<ApiResponse<T>> => {
  return apiRequest<T>(url, { method: 'GET' });
};

/**
 * DELETE request helper
 */
export const apiDelete = async <T>(url: string): Promise<ApiResponse<T>> => {
  return apiRequest<T>(url, { method: 'DELETE' });
};
