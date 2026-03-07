import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createApiResponse,
  createApiError,
  createApiSuccess,
  getCSRFToken,
  clearCSRFToken,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from '@/utils/api';

describe('api.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCSRFToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createApiResponse', () => {
    it('başarılı yanıt ile data ve success true döndürmeli', () => {
      const res = createApiResponse({ id: 1 }, 'OK');
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ id: 1 });
      expect(res.message).toBe('OK');
    });

    it('hata yanıtında success false ve error set olmalı', () => {
      const res = createApiResponse(null, 'Hata', false);
      expect(res.success).toBe(false);
      expect(res.message).toBe('Hata');
      expect(res).toHaveProperty('error', 'Hata');
    });

    it('varsayılan success true olmalı', () => {
      const res = createApiResponse({ x: 1 });
      expect(res.success).toBe(true);
    });
  });

  describe('createApiError', () => {
    it('Response ile JSON body ve status döndürmeli', async () => {
      const res = createApiError('Bad request', 400);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe('Bad request');
    });

    it('varsayılan status 400 olmalı', async () => {
      const res = createApiError('Error');
      expect(res.status).toBe(400);
    });
  });

  describe('createApiSuccess', () => {
    it('200 ve JSON body döndürmeli', async () => {
      const res = createApiSuccess({ id: 1 }, 'Created');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual({ id: 1 });
      expect(json.message).toBe('Created');
    });
  });

  describe('getCSRFToken', () => {
    it('fetch başarılı olunca token döndürmeli', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'abc-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      const token = await getCSRFToken();
      expect(token).toBe('abc-123');
      expect(mockFetch).toHaveBeenCalledWith('/api/csrf-token', expect.any(Object));
    });

    it('fetch 401 dönünce null döndürmeli', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 401 })
      );
      const token = await getCSRFToken();
      expect(token).toBeNull();
    });

    it('fetch hata verince null döndürmeli', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));
      const token = await getCSRFToken();
      expect(token).toBeNull();
    });
  });

  describe('clearCSRFToken', () => {
    it('cache temizlendikten sonra getCSRFToken yeniden fetch yapmalı', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'first' }), { status: 200 })
      );
      await getCSRFToken();
      clearCSRFToken();
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'second' }), { status: 200 })
      );
      const token = await getCSRFToken();
      expect(token).toBe('second');
      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2);
    });
  });

  describe('apiRequest', () => {
    it('GET 200 ile success ve data döndürmeli', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      const result = await apiRequest<{ items: unknown[] }>('/api/products');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ items: [] });
    });

    it('4xx yanıtta success false ve error mesajı', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Yetkisiz' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      const result = await apiRequest('/api/orders');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Yetkisiz');
    });

    it('5xx yanıtta success false', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      const result = await apiRequest('/api/test');
      expect(result.success).toBe(false);
    });

    it('network/reject hatada success false ve mesaj', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Failed to fetch'));
      const result = await apiRequest('/api/test');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to fetch');
    });

    it('JSON parse edilemeyen yanıtta hata yaklamalı', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response('not json', { status: 200 })
      );
      const result = await apiRequest('/api/test');
      expect(result.success).toBe(false);
    });
  });

  describe('apiGet', () => {
    it('GET isteği yapmalı', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), { status: 200 })
      );
      const result = await apiGet<{ id: number }>('/api/products/1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1 });
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        '/api/products/1',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('apiPost', () => {
    it('POST ile body göndermeli', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      await apiPost('/api/orders', { customerId: 1, products: [] });
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        '/api/orders',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ customerId: 1, products: [] }),
        })
      );
    });
  });

  describe('apiPut', () => {
    it('PUT ile body göndermeli', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      await apiPut('/api/products/1', { name: 'Updated' });
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        '/api/products/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        })
      );
    });
  });

  describe('apiDelete', () => {
    it('DELETE isteği yapmalı', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );
      await apiDelete('/api/products/1');
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        '/api/products/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
