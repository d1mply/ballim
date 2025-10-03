import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET() {
  try {
    // Filament tablosundaki filament_code alanını VARCHAR(30) yap
    await query(`
      ALTER TABLE filaments 
      ALTER COLUMN filament_code TYPE VARCHAR(30)
    `);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Filament tablosu güncellendi: filament_code VARCHAR(30) yapıldı' 
    });
  } catch (error) {
    console.error('Tablo güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Tablo güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}