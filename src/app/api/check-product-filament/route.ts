import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get('code');
    
    if (!productCode) {
      return NextResponse.json({ error: 'Ürün kodu gerekli' }, { status: 400 });
    }
    
    // Ürün ve filament bilgilerini getir
    const result = await query(`
      SELECT 
        p.id,
        p.product_code,
        p.product_type,
        p.piece_gram,
        p.total_gram,
        pf.filament_type,
        pf.filament_color,
        pf.weight as filament_weight,
        pf.filament_density as brand
      FROM products p
      LEFT JOIN product_filaments pf ON p.id = pf.product_id
      WHERE p.product_code = $1
    `, [productCode]);
    
    return NextResponse.json({
      productCode,
      data: result.rows,
      calculation: result.rows.map(row => ({
        filament: `${row.filament_type} ${row.filament_color}`,
        weight_per_piece: `${row.filament_weight}gr`,
        for_10_pieces: `${row.filament_weight * 10}gr`,
        product_piece_gram: `${row.piece_gram}gr`
      }))
    });
  } catch (error) {
    console.error('Ürün filament kontrol hatası:', error);
    return NextResponse.json({ error: 'Kontrol başarısız' }, { status: 500 });
  }
} 