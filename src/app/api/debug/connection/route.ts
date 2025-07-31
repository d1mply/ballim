import { NextResponse } from 'next/server';
import { testConnection, query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Connection test başlatılıyor...');
    
    // Environment variables check
    const envCheck = {
      hasDatabase_URL: !!process.env.DATABASE_URL,
      hasDB_HOST: !!process.env.DB_HOST,
      hasDB_USER: !!process.env.DB_USER,
      hasDB_PASSWORD: !!process.env.DB_PASSWORD,
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST ? process.env.DB_HOST.substring(0, 20) + '...' : 'Yok',
      DB_NAME: process.env.DB_NAME
    };
    
    // Connection test
    const connectionResult = await testConnection();
    
    let tablesCheck = null;
    if (connectionResult) {
      try {
        const result = await query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        tablesCheck = {
          success: true,
          tableCount: result.rows.length,
          tables: result.rows.map(row => row.table_name)
        };
      } catch (error) {
        tablesCheck = {
          success: false,
          error: error.message
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      connection: {
        success: connectionResult,
        timestamp: new Date().toISOString()
      },
      tables: tablesCheck
    });
    
  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}