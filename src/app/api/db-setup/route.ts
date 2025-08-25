import { NextResponse } from 'next/server';
import { createTables } from '@/lib/db';

export async function GET() {
  try {
    console.log('API: createTables fonksiyonu çağrıldı.');
    const success = await createTables();
    if (success) {
      console.log('API: Tablolar başarıyla oluşturuldu veya zaten mevcuttu.');
      return NextResponse.json({ message: 'Tablolar başarıyla oluşturuldu veya zaten mevcuttu.' }, { status: 200 });
    } else {
      console.error('API: Tablolar oluşturulurken bir hata oluştu.');
      return NextResponse.json({ error: 'Tablolar oluşturulurken bir hata oluştu.' }, { status: 500 });
    }
  } catch (error) {
    console.error('API: db-setup endpoint hatası:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
} 