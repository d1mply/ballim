import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { verifyJWT } from '@/lib/jwt';

// Audit logları getir
export async function GET(request: NextRequest) {
  try {
    // Admin kontrolü
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { valid, payload } = verifyJWT(token);
    if (!valid || payload?.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    // Tablo var mı kontrol et, yoksa oluştur
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          user_name TEXT,
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id TEXT,
          entity_name TEXT,
          details JSONB,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Eksik sütunları ekle (mevcut tablolar için)
      await query(`
        ALTER TABLE audit_logs 
        ADD COLUMN IF NOT EXISTS user_id TEXT,
        ADD COLUMN IF NOT EXISTS user_name TEXT,
        ADD COLUMN IF NOT EXISTS action VARCHAR(50),
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS entity_id TEXT,
        ADD COLUMN IF NOT EXISTS entity_name TEXT,
        ADD COLUMN IF NOT EXISTS details JSONB,
        ADD COLUMN IF NOT EXISTS ip_address TEXT,
        ADD COLUMN IF NOT EXISTS user_agent TEXT
      `);
      
      // Index'leri oluştur
      await query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)
      `);
    } catch (tableError) {
      // Tablo zaten varsa hata vermez, devam et
      console.log('Audit logs tablosu kontrol edildi:', tableError);
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Filtreler
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (entityType) {
      whereConditions.push(`entity_type = $${paramIndex++}`);
      params.push(entityType);
    }

    if (action) {
      whereConditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate + ' 23:59:59');
    }

    if (search) {
      whereConditions.push(`(
        entity_name ILIKE $${paramIndex} OR 
        user_name ILIKE $${paramIndex} OR 
        details::text ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Toplam kayıt sayısı (COUNT için ayrı params kullan)
    const countParams = [...params]; // Mevcut filtre parametrelerini kopyala
    const countResult = await query(`
      SELECT COUNT(*) as total 
      FROM audit_logs 
      ${whereClause}
    `, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Logları getir (LIMIT ve OFFSET için params'a ekle)
    const limitParamIndex = paramIndex++;
    const offsetParamIndex = paramIndex;
    params.push(limit, offset);
    const result = await query(`
      SELECT 
        id,
        user_id,
        user_name,
        action,
        entity_type,
        entity_id,
        entity_name,
        details,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `, params);

    const logs = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at
    }));

    return NextResponse.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Audit log getirme hatası:', error);
    return NextResponse.json(
      { error: 'Audit logları getirilemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

