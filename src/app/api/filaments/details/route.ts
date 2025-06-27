import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Filament tipine göre mevcut renk ve marka kombinasyonlarını getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { error: 'Filament tipi gerekli' },
        { status: 400 }
      );
    }

    // Aynı tip/renk/marka kombinasyonlarını birleştir ve toplam kalan ağırlığı hesapla
    const result = await query(`
      SELECT 
        color,
        brand,
        SUM(remaining_weight) as remaining_weight
      FROM filaments
      WHERE type = $1 AND remaining_weight > 0
      GROUP BY color, brand
      ORDER BY color, brand
    `, [type]);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Filament detayları alınırken hata:', error);
    return NextResponse.json(
      { error: 'Filament detayları alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 