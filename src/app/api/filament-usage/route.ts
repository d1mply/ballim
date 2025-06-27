import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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
      ORDER BY fu.usage_date DESC, fu.id DESC
    `);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Filament kullanım geçmişi hatası:', error);
    return NextResponse.json(
      { error: 'Kullanım geçmişi getirilemedi' },
      { status: 500 }
    );
  }
} 