/**
 * Test helpers for Next.js 15 App Router route handler tests.
 * Creates NextRequest and NextResponse instances for unit testing API routes.
 */

import { NextRequest, NextResponse } from 'next/server';

export interface MockRequestOptions {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Create a NextRequest for testing route handlers.
 * Supports body, headers, cookies (via Cookie header), and searchParams.
 */
export function createMockRequest(options: MockRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    cookies = {},
    searchParams = {},
  } = options;

  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('; ');
  const combinedHeaders = new Headers(headers);
  if (cookieHeader) {
    combinedHeaders.set('Cookie', cookieHeader);
  }
  if (!combinedHeaders.has('user-agent')) {
    combinedHeaders.set('user-agent', 'Mozilla/5.0 (Test)');
  }

  const init: RequestInit = {
    method,
    headers: combinedHeaders,
  };
  if (body !== undefined && method !== 'GET') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), init);
}

/**
 * Helper to parse JSON body from a NextResponse (for assertions).
 */
export async function getResponseJson(res: NextResponse): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
