import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Benzersiz filament tiplerini getir
export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT DISTINCT type 
      FROM filaments 
      WHERE type IS NOT NULL AND type != '' 
      ORDER BY type
    `);
    
    // Sadece type değerlerini dizi olarak döndür
    const types = result.rows.map(row => row.type);
    
    return NextResponse.json(types);
  } catch (error) {
    console.error('Filament tipleri getirme hatası:', error);
    return NextResponse.json(
      { error: 'Filament tipleri getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 