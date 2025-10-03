import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // order_items tablosuna status sütunu ekle
    await query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'onay_bekliyor'
    `);
    console.log('✅ order_items tablosuna status sütunu eklendi');

    // Mevcut kayıtların status alanını güncelle
    await query(`
      UPDATE order_items 
      SET status = 'onay_bekliyor'
      WHERE status IS NULL
    `);
    console.log('✅ Mevcut order_items kayıtları güncellendi');

    // Kontrol et
    const checkResult = await query(`
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

    console.log('📊 Güncellenmiş kayıtlar:', checkResult.rows);

    return NextResponse.json({ 
      success: true, 
      message: 'Order items status alanları güncellendi',
      updatedRecords: checkResult.rows
    });
  } catch (error) {
    console.error('❌ Order items status güncellenirken hata:', error);
    return NextResponse.json(
      { success: false, error: 'Order items status güncellenemedi' },
      { status: 500 }
    );
  }
}
