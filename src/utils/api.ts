// API yardımcı fonksiyonları - Clean Code için API utilities

import { ApiResponse } from '@/types';

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
 * Fetch API wrapper - error handling ile
 */
export const apiRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
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
export const apiPost = async <T>(
  url: string,
  body: any
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(url, {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

/**
 * PUT request helper
 */
export const apiPut = async <T>(
  url: string,
  body: any
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
