import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Sistem kullanıcısını oluştur veya getir
export async function GET() {
  try {
    // Sistem kullanıcısını kontrol et
    const checkResult = await query(`
      SELECT id FROM customers WHERE id = 1
    `);

    if (checkResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Sistem kullanıcısı zaten mevcut',
        customerId: 1
      });
    }

    // Sistem kullanıcısını oluştur
    await query(`
      INSERT INTO customers (
        id, customer_code, name, phone, customer_type, 
        created_at, updated_at
      )
      VALUES (
        1, 
        'SYS-001', 
        'Sistem Kullanıcısı (Stok Üretimi)', 
        '0000000000', 
        'Sistem',
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO NOTHING
    `);

    return NextResponse.json({
      success: true,
      message: 'Sistem kullanıcısı oluşturuldu',
      customerId: 1
    });

  } catch (error) {
    console.error('Sistem kullanıcısı oluşturma hatası:', error);
    return NextResponse.json(
      { error: 'Sistem kullanıcısı oluşturulamadı' },
      { status: 500 }
    );
  }
}

