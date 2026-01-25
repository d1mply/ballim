import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from './jwt';
import { checkRateLimit, logSecurityEvent, getClientIP, validateCSRFToken } from './security';

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/auth',
  '/api/csrf-token',
  '/api/db-setup',
  '/api/db-diagnostics',
  '/api/debug',
];

// Endpoints that require admin role
const ADMIN_ONLY_ENDPOINTS = [
  '/api/audit-logs',
  '/api/customers/system',
  '/api/fix-tables',
  '/api/fix-order-items-status',
  '/api/reset-filament',
  '/api/setup-tables',
];

// Auth result interface
export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string | number;
    role: 'admin' | 'customer';
    customerId?: number;
  };
  error?: string;
  status?: number;
}

/**
 * Verify JWT token from request
 */
export function verifyAuth(request: NextRequest): AuthResult {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return {
      authenticated: false,
      error: 'Authentication required',
      status: 401,
    };
  }

  const verification = verifyJWT(token);
  
  if (!verification.valid || !verification.payload) {
    return {
      authenticated: false,
      error: 'Invalid or expired token',
      status: 401,
    };
  }

  return {
    authenticated: true,
    user: {
      id: verification.payload.sub || verification.payload.id,
      role: verification.payload.role as 'admin' | 'customer',
      customerId: verification.payload.customerId,
    },
  };
}

/**
 * Check if endpoint is public
 */
export function isPublicEndpoint(pathname: string): boolean {
  return PUBLIC_ENDPOINTS.some(ep => pathname.startsWith(ep));
}

/**
 * Check if endpoint requires admin role
 */
export function isAdminOnlyEndpoint(pathname: string): boolean {
  return ADMIN_ONLY_ENDPOINTS.some(ep => pathname.startsWith(ep));
}

/**
 * Verify CSRF token for state-changing requests
 */
export function verifyCSRF(request: NextRequest): boolean {
  // Only check for state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  const requestToken = request.headers.get('x-csrf-token') || '';
  const cookieHeader = request.cookies.get('csrf-token')?.value || '';

  if (!requestToken || !cookieHeader) {
    return false;
  }

  return validateCSRFToken(requestToken, cookieHeader);
}

/**
 * API Authentication Middleware
 * Returns null if authenticated, NextResponse if blocked
 */
export function apiAuthMiddleware(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const clientIP = getClientIP(request as unknown as Request);

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return null;
  }

  // Check rate limiting first
  if (!checkRateLimit(clientIP)) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      ip: clientIP,
      path: pathname,
      method: request.method,
    }, 'HIGH');
    
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Skip authentication for public endpoints
  if (isPublicEndpoint(pathname)) {
    return null;
  }

  // Verify authentication
  const auth = verifyAuth(request);
  
  if (!auth.authenticated) {
    logSecurityEvent('UNAUTHORIZED_ACCESS', {
      ip: clientIP,
      path: pathname,
      method: request.method,
      error: auth.error || 'Unknown',
    }, 'MEDIUM');

    return NextResponse.json(
      { error: auth.error },
      { status: auth.status || 401 }
    );
  }

  // Check admin-only endpoints
  if (isAdminOnlyEndpoint(pathname) && auth.user?.role !== 'admin') {
    logSecurityEvent('ADMIN_ACCESS_DENIED', {
      ip: clientIP,
      path: pathname,
      userId: String(auth.user?.id || 'unknown'),
      role: auth.user?.role || 'unknown',
    }, 'HIGH');

    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  // CSRF verification for state-changing requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (!verifyCSRF(request)) {
      logSecurityEvent('CSRF_VALIDATION_FAILED', {
        ip: clientIP,
        path: pathname,
        method: request.method,
      }, 'HIGH');

      // For now, log but don't block (gradual rollout)
      // TODO: Enable blocking after frontend CSRF implementation
      console.warn(`[CSRF WARNING] ${pathname} - Token validation failed`);
    }
  }

  return null; // Authenticated, proceed
}

/**
 * Get authenticated user from request headers
 * Used in API routes after middleware validation
 */
export function getAuthUser(request: NextRequest): AuthResult['user'] | null {
  const auth = verifyAuth(request);
  return auth.authenticated ? auth.user! : null;
}

/**
 * Check if user can access customer data
 * Admin can access all, customers can only access their own data
 */
export function canAccessCustomerData(
  authUser: AuthResult['user'] | null,
  targetCustomerId: number
): boolean {
  if (!authUser) return false;
  if (authUser.role === 'admin') return true;
  return authUser.customerId === targetCustomerId;
}

/**
 * API Response helper with security headers
 */
export function secureJsonResponse(
  data: unknown,
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...headers,
    },
  });
}
