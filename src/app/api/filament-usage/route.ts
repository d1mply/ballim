import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filamentId = searchParams.get('filamentId');
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100')));

    const params: any[] = [];
    let whereClause = '';
    
    if (filamentId) {
      whereClause = 'WHERE fu.filament_id = $1';
      params.push(filamentId);
    }
    
    params.push(limit);
    const limitParamIndex = params.length;

    const result = await query(`
      SELECT 
        fu.id,
        fu.usage_date,
        fu.amount,
        fu.description,
        f.filament_code,
        f.name as filament_name,
        f.type,
        f.color,
        f.brand,
        f.remaining_weight as current_remaining,
        p.product_code,
        p.product_type,
        o.order_code
      FROM filament_usage fu
      LEFT JOIN filaments f ON fu.filament_id = f.id
      LEFT JOIN products p ON fu.product_id = p.id
      LEFT JOIN orders o ON fu.order_id = o.id
      ${whereClause}
      ORDER BY fu.usage_date DESC, fu.id DESC
      LIMIT $${limitParamIndex}
    `, params);
    
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Filament kullanım geçmişi hatası:', error);
    return NextResponse.json(
      { error: 'Kullanım geçmişi getirilemedi', details: error?.message || 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
} 