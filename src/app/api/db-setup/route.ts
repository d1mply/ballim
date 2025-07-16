import { NextResponse } from 'next/server';
import { createTables } from '../../../lib/db';

export async function POST() {
  try {
    console.log('Veritabanı tabloları oluşturuluyor...');
    
    const success = await createTables();
    
    if (success) {
      return NextResponse.json({
        status: 'ok',
        message: 'Tüm tablolar başarıyla oluşturuldu'
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'Bazı tablolar oluşturulurken hata oluştu'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Tablo oluşturma hatası:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Tablolar oluşturulurken hata oluştu',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 