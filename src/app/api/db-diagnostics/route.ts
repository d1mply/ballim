import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  const results = {
    diagnostics: [],
    errors: []
  };
  
  try {
    // 1. Bağlantı testi - şifresiz
    try {
      results.diagnostics.push("Şifresiz bağlantı testi başlıyor...");
      const testPool1 = new Pool({
        user: 'postgres',  // PostgreSQL'in varsayılan kullanıcısı
        host: 'localhost',
        database: 'postgres',  // varsayılan veritabanı
        port: 5432,
      });
      
      const res1 = await testPool1.query('SELECT 1 as test');
      results.diagnostics.push("Şifresiz bağlantı başarılı: " + JSON.stringify(res1.rows[0]));
      await testPool1.end();
    } catch (error) {
      results.errors.push("Şifresiz bağlantı hatası: " + (error instanceof Error ? error.message : String(error)));
    }
    
    // 2. Bağlantı testi - 'postgres' kullanıcısı ve 'ballim' veritabanı ile
    try {
      results.diagnostics.push("'postgres' kullanıcısı ile 'ballim' veritabanına bağlantı testi başlıyor...");
      const testPool2 = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'ballim',
        password: 'ballim146161',
        port: 5432,
      });
      
      const res2 = await testPool2.query('SELECT current_database() as db');
      results.diagnostics.push("'postgres' kullanıcısı ile 'ballim' veritabanına bağlantı başarılı: " + JSON.stringify(res2.rows[0]));
      await testPool2.end();
    } catch (error) {
      results.errors.push("'postgres' kullanıcısı ile 'ballim' veritabanına bağlantı hatası: " + (error instanceof Error ? error.message : String(error)));
    }
    
    // 3. Veritabanı listesini getir
    try {
      results.diagnostics.push("Veritabanı listesi kontrol ediliyor...");
      const testPool3 = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        port: 5432,
      });
      
      const res3 = await testPool3.query('SELECT datname FROM pg_database WHERE datistemplate = false');
      results.diagnostics.push("Veritabanı listesi: " + JSON.stringify(res3.rows.map(row => row.datname)));
      await testPool3.end();
    } catch (error) {
      results.errors.push("Veritabanı listesi hatası: " + (error instanceof Error ? error.message : String(error)));
    }
    
    // 4. Kullanıcı listesini getir
    try {
      results.diagnostics.push("Kullanıcı listesi kontrol ediliyor...");
      const testPool4 = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        port: 5432,
      });
      
      const res4 = await testPool4.query('SELECT usename FROM pg_catalog.pg_user');
      results.diagnostics.push("Kullanıcı listesi: " + JSON.stringify(res4.rows.map(row => row.usename)));
      await testPool4.end();
    } catch (error) {
      results.errors.push("Kullanıcı listesi hatası: " + (error instanceof Error ? error.message : String(error)));
    }
    
    return NextResponse.json({
      status: results.errors.length === 0 ? 'ok' : 'warning',
      diagnostics: results.diagnostics,
      errors: results.errors
    });
  } catch (error) {
    console.error('Tanılama hatası:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Diagnostik çalıştırılırken hata',
      error: error instanceof Error ? error.message : String(error),
      diagnostics: results.diagnostics,
      errors: results.errors
    }, {
      status: 500
    });
  }
} 