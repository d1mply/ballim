import { NextResponse } from 'next/server';
import { createTables } from '@/lib/db';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const success = await createTables();
    if (success) {
      return NextResponse.json({ message: 'Tablolar başarıyla oluşturuldu veya zaten mevcuttu.' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Tablolar oluşturulurken bir hata oluştu.' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 