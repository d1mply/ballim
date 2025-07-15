import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    console.log('Tablo yapıları güncelleniyor...');
    
    // Products tablosunu güncelle
    try {
      await query(`
        ALTER TABLE products 
        ALTER COLUMN product_code TYPE VARCHAR(50)
      `);
      console.log('✅ Products tablosu güncellendi');
    } catch (error) {
      console.log('Products tablosu zaten güncel veya hata:', error);
    }
    
    // Customers tablosunu güncelle
    try {
      await query(`
        ALTER TABLE customers 
        ALTER COLUMN customer_code TYPE VARCHAR(50)
      `);
      console.log('✅ Customers tablosu güncellendi');
    } catch (error) {
      console.log('Customers tablosu zaten güncel veya hata:', error);
    }
    
    // Orders tablosunu güncelle
    try {
      await query(`
        ALTER TABLE orders 
        ALTER COLUMN order_code TYPE VARCHAR(50)
      `);
      console.log('✅ Orders tablosu güncellendi');
    } catch (error) {
      console.log('Orders tablosu zaten güncel veya hata:', error);
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'Tablo yapıları başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Tablo güncelleme hatası:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Tablolar güncellenirken hata oluştu',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 