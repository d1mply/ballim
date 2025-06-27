import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Basit bir sorgu çalıştır
    console.log('Veritabanı bağlantısı test ediliyor...');
    
    // Pool bilgilerini kontrol et
    const poolStatus = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      user: pool.options.user,
      database: pool.options.database,
      host: pool.options.host
    };
    
    console.log('Pool bilgileri:', poolStatus);
    
    // Basit bir sorgu çalıştır
    const result = await query('SELECT NOW() as current_time');
    console.log('Sorgu sonucu:', result.rows[0]);
    
    return NextResponse.json({
      status: 'ok',
      message: 'Veritabanı bağlantısı başarılı',
      time: result.rows[0].current_time,
      poolStatus,
      config: {
        user: pool.options.user,
        database: pool.options.database
      }
    });
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Veritabanı bağlantısında hata',
      error: error instanceof Error ? error.message : String(error),
      config: {
        user: pool.options?.user,
        database: pool.options?.database
      }
    }, {
      status: 500
    });
  }
} 