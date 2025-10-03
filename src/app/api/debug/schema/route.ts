import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Inventory tablosunun şemasını kontrol et
    const schemaResult = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'inventory' 
      ORDER BY ordinal_position;
    `);

    // Bir inventory örneği al
    const sampleOrder = await query(`
      SELECT * FROM inventory LIMIT 1;
    `);

    return NextResponse.json({
      schema: schemaResult.rows,
      sampleOrder: sampleOrder.rows[0] || null
    });
  } catch (error) {
    console.error('Şema kontrol hatası:', error);
    return NextResponse.json(
      { error: 'Şema kontrol edilemedi', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 