import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filamentId = searchParams.get('id');
    const newWeight = searchParams.get('weight') || '1000';
    
    if (filamentId) {
      // Belirli filament sıfırla
      await query(`
        UPDATE filaments 
        SET remaining_weight = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [parseInt(newWeight), filamentId]);
      
      // Kullanım geçmişini temizle
      await query(`
        DELETE FROM filament_usage WHERE filament_id = $1
      `, [filamentId]);
      
    } else {
      // Tüm filamentleri sıfırla
      await query(`
        UPDATE filaments 
        SET remaining_weight = total_weight, updated_at = CURRENT_TIMESTAMP
      `);
      
      // Tüm kullanım geçmişini temizle
      await query(`
        DELETE FROM filament_usage
      `);
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'Filament stokları sıfırlandı'
    });
  } catch (error) {
    console.error('Filament sıfırlama hatası:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Sıfırlama başarısız',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 