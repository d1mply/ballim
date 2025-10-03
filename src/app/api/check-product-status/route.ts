import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // order_items tablosundaki tüm ürünleri ve durumlarını getir
    const result = await query(`
      SELECT 
        oi.id,
        oi.product_code,
        oi.status,
        o.order_code
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      ORDER BY oi.id DESC
      LIMIT 10
    `);

    console.log('📊 Veritabanındaki ürün durumları:', result.rows);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Ürün durumları kontrol edilirken hata:', error);
    return NextResponse.json(
      { error: 'Ürün durumları kontrol edilemedi' },
      { status: 500 }
    );
  }
}
