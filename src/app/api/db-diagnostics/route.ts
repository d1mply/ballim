import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { pool, query } from '../../../lib/db';

export async function GET() {
  const results = {
    diagnostics: [],
    errors: [],
    envVars: {}
  };
  
  try {
    // Environment variables'ları kontrol et
    results.envVars = {
      DB_HOST: process.env.DB_HOST || 'NOT_SET',
      DB_PORT: process.env.DB_PORT || 'NOT_SET', 
      DB_NAME: process.env.DB_NAME || 'NOT_SET',
      DB_USER: process.env.DB_USER || 'NOT_SET',
      DB_PASSWORD: process.env.DB_PASSWORD ? '[SET]' : 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
    };
    
    results.diagnostics.push("Environment variables kontrol edildi");
    
    // 1. Ana pool ile bağlantı testi
    try {
      results.diagnostics.push("Ana pool ile bağlantı testi başlıyor...");
      results.diagnostics.push(`Bağlantı hedefi: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      
      const res1 = await query('SELECT 1 as test, current_database() as db, current_user as user');
      results.diagnostics.push("Ana pool bağlantısı başarılı: " + JSON.stringify(res1.rows[0]));
    } catch (error) {
      results.errors.push("Ana pool bağlantı hatası: " + (error instanceof Error ? error.message : String(error)));
    }
    
    // 2. Tablolar var mı kontrol et
    try {
      results.diagnostics.push("Tablo varlığı kontrol ediliyor...");
      const res2 = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const tableNames = res2.rows.map(row => row.table_name);
      results.diagnostics.push("Mevcut tablolar: " + JSON.stringify(tableNames));
      
      if (tableNames.length === 0) {
        results.diagnostics.push("❌ Hiç tablo bulunamadı - db-setup çalıştırılmalı");
      } else {
        results.diagnostics.push("✅ Tablolar mevcut");
      }
    } catch (error) {
      results.errors.push("Tablo kontrol hatası: " + (error instanceof Error ? error.message : String(error)));
    }
    
    // 3. Veritabanı versiyonu
    try {
      results.diagnostics.push("PostgreSQL versiyonu kontrol ediliyor...");
      const res3 = await query('SELECT version()');
      results.diagnostics.push("PostgreSQL versiyonu: " + res3.rows[0].version.substring(0, 50) + "...");
    } catch (error) {
      results.errors.push("Versiyon kontrol hatası: " + (error instanceof Error ? error.message : String(error)));
    }
    
    return NextResponse.json({
      status: results.errors.length === 0 ? 'ok' : 'warning',
      diagnostics: results.diagnostics,
      errors: results.errors,
      envVars: results.envVars
    });
  } catch (error) {
    console.error('Tanılama hatası:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Diagnostik çalıştırılırken hata',
      error: error instanceof Error ? error.message : String(error),
      diagnostics: results.diagnostics,
      errors: results.errors,
      envVars: results.envVars
    }, {
      status: 500
    });
  }
} 