import { query } from './db';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'VIEW' 
  | 'LOGIN' 
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'STATUS_CHANGE';

export type EntityType = 
  | 'PRODUCT' 
  | 'FILAMENT' 
  | 'ORDER' 
  | 'CUSTOMER' 
  | 'PAYMENT' 
  | 'PACKAGE'
  | 'STOCK'
  | 'USER';

export interface AuditLogData {
  userId?: string | null;
  userName?: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string | number | null;
  entityName?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Audit log kaydı oluştur
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await query(`
      INSERT INTO audit_logs (
        user_id, user_name, action, entity_type, entity_id, entity_name, 
        details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `, [
      data.userId || null,
      data.userName || null,
      data.action,
      data.entityType,
      data.entityId ? String(data.entityId) : null,
      data.entityName || null,
      data.details ? JSON.stringify(data.details) : null,
      data.ipAddress || null,
      data.userAgent || null
    ]);
  } catch (error) {
    // Audit log hatası sistemin çalışmasını engellememeli
    console.error('Audit log kaydı oluşturulamadı:', error);
  }
}

import { verifyJWT } from './jwt';

/**
 * Request'ten kullanıcı bilgilerini al
 */
export async function getUserFromRequest(request: Request): Promise<{ userId?: string; userName?: string; ipAddress?: string; userAgent?: string }> {
  // JWT token'dan kullanıcı bilgisi al
  const cookies = request.headers.get('cookie') || '';
  const tokenMatch = cookies.match(/auth-token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  
  let userId: string | undefined;
  let userName: string | undefined;
  
  if (token) {
    try {
      const { valid, payload } = verifyJWT(token);
      if (valid && payload) {
        userId = payload.sub || payload.id;
        userName = payload.username || payload.name;
      }
    } catch (error) {
      // JWT parse hatası, sessizce devam et
    }
  }
  
  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return {
    userId,
    userName,
    ipAddress: ipAddress.split(',')[0].trim(),
    userAgent
  };
}

/**
 * Kullanıcı bilgisini localStorage'dan al (client-side için)
 */
export function getUserFromClient(): { userId?: string; userName?: string } {
  if (typeof window === 'undefined') return {};
  
  try {
    const loggedUser = localStorage.getItem('loggedUser');
    if (loggedUser) {
      const user = JSON.parse(loggedUser);
      return {
        userId: user.id || user.username,
        userName: user.name || user.username
      };
    }
  } catch (error) {
    console.error('Kullanıcı bilgisi alınamadı:', error);
  }
  
  return {};
}

