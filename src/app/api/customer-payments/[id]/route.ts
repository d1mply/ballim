import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Geçersiz müşteri ID' },
        { status: 400 }
      );
    }

    const queryText = `
      SELECT 
        id,
        odeme_tarihi,
        tutar,
        odeme_yontemi,
        aciklama,
        durum
      FROM odemeler 
      WHERE musteri_id = $1
      ORDER BY odeme_tarihi DESC
      LIMIT $2
    `;

    const result = await dbQuery(queryText, [customerId, limit]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Customer payments error:', error);
    return NextResponse.json(
      { error: 'Müşteri ödemeleri alınırken hata oluştu' },
      { status: 500 }
    );
  }
} 