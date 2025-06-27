import { NextRequest, NextResponse } from 'next/server';
import { createTables } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Tablolar oluşturuluyor...');
    
    const success = await createTables();
    
    return NextResponse.json({
      status: success ? 'ok' : 'error',
      message: success ? 'Tablolar oluşturuldu' : 'Bazı tablolarda hata'
    });
  } catch (error) {
    console.error('Tablo oluşturma hatası:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Tablolar oluşturulamadı',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 