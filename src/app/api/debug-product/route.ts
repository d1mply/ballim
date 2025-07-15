import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Ürün ve filament ilişkilerini debug et
    const products = await query(`
      SELECT p.*, 
        (SELECT json_agg(json_build_object(
          'id', pf.id,
          'filament_type', pf.filament_type,
          'filament_color', pf.filament_color,
          'filament_density', pf.filament_density,
          'weight', pf.weight
        ))
        FROM product_filaments pf
        WHERE pf.product_id = p.id) as filaments_data
      FROM products p
      ORDER BY p.id DESC
    `);
    
    return NextResponse.json({
      products: products.rows,
      total: products.rows.length
    });
  } catch (error) {
    console.error('Debug product hatası:', error);
    return NextResponse.json(
      { error: 'Debug işlemi başarısız' },
      { status: 500 }
    );
  }
} 