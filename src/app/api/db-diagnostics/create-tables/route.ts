import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    let result = { success: true, tables: [] };
    
    try {
      // Önceki işlemleri geri al
      await client.query('BEGIN');
      
      // Filament tablosu
      const createFilamentsTable = await client.query(`
        CREATE TABLE IF NOT EXISTS filamentler (
          id SERIAL PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          color VARCHAR(100) NOT NULL,
          quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
          unit VARCHAR(10) NOT NULL DEFAULT 'gram',
          price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      result.tables.push({ name: 'filamentler', created: createFilamentsTable.command === 'CREATE' });
      
      // Ürünler tablosu
      const createProductsTable = await client.query(`
        CREATE TABLE IF NOT EXISTS urunler (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          weight NUMERIC(10, 2),
          filament_type VARCHAR(100),
          print_time INTEGER,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      result.tables.push({ name: 'urunler', created: createProductsTable.command === 'CREATE' });
      
      // Müşteriler tablosu
      const createCustomersTable = await client.query(`
        CREATE TABLE IF NOT EXISTS musteriler (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(255),
          company VARCHAR(255),
          tax_number VARCHAR(50),
          address TEXT,
          type VARCHAR(50) NOT NULL DEFAULT 'Bireysel',
          username VARCHAR(100) NOT NULL,
          password VARCHAR(100) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      result.tables.push({ name: 'musteriler', created: createCustomersTable.command === 'CREATE' });
      
      // Müşteri özel filament fiyatları tablosu
      const createCustomerPricesTable = await client.query(`
        CREATE TABLE IF NOT EXISTS musteri_filament_fiyatlari (
          id SERIAL PRIMARY KEY,
          musteri_id INTEGER NOT NULL REFERENCES musteriler(id) ON DELETE CASCADE,
          filament_type VARCHAR(100) NOT NULL,
          price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      result.tables.push({ name: 'musteri_filament_fiyatlari', created: createCustomerPricesTable.command === 'CREATE' });
      
      // Siparişler tablosu
      const createOrdersTable = await client.query(`
        CREATE TABLE IF NOT EXISTS siparisler (
          id SERIAL PRIMARY KEY,
          musteri_id INTEGER NOT NULL REFERENCES musteriler(id) ON DELETE CASCADE,
          order_date TIMESTAMP NOT NULL DEFAULT NOW(),
          status VARCHAR(50) NOT NULL DEFAULT 'Yeni',
          total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      result.tables.push({ name: 'siparisler', created: createOrdersTable.command === 'CREATE' });
      
      // Sipariş detayları tablosu
      const createOrderDetailsTable = await client.query(`
        CREATE TABLE IF NOT EXISTS siparis_detaylari (
          id SERIAL PRIMARY KEY,
          siparis_id INTEGER NOT NULL REFERENCES siparisler(id) ON DELETE CASCADE,
          urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE RESTRICT,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          filament_type VARCHAR(100),
          filament_color VARCHAR(100),
          print_time INTEGER,
          weight NUMERIC(10, 2),
          status VARCHAR(50) NOT NULL DEFAULT 'Beklemede',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      result.tables.push({ name: 'siparis_detaylari', created: createOrderDetailsTable.command === 'CREATE' });
      
      // Cari hesap tablosu
      const createAccountingTable = await client.query(`
        CREATE TABLE IF NOT EXISTS cari_hesap (
          id SERIAL PRIMARY KEY,
          musteri_id INTEGER NOT NULL REFERENCES musteriler(id) ON DELETE CASCADE,
          tarih DATE NOT NULL,
          aciklama TEXT,
          islem_turu VARCHAR(50) NOT NULL,
          tutar NUMERIC(10, 2) NOT NULL,
          odeme_yontemi VARCHAR(100),
          siparis_id INTEGER REFERENCES siparisler(id) ON DELETE SET NULL,
          bakiye NUMERIC(10, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      result.tables.push({ name: 'cari_hesap', created: createAccountingTable.command === 'CREATE' });
      
      // Ödemeler tablosu
      const createPaymentsTable = await client.query(`
        CREATE TABLE IF NOT EXISTS odemeler (
          id SERIAL PRIMARY KEY,
          musteri_id INTEGER NOT NULL REFERENCES musteriler(id) ON DELETE CASCADE,
          siparis_id INTEGER REFERENCES siparisler(id) ON DELETE SET NULL,
          odeme_tarihi DATE NOT NULL,
          tutar NUMERIC(10, 2) NOT NULL,
          odeme_yontemi VARCHAR(100) NOT NULL,
          vade_ay INTEGER,
          durum VARCHAR(50) NOT NULL DEFAULT 'Ödendi',
          aciklama TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      result.tables.push({ name: 'odemeler', created: createPaymentsTable.command === 'CREATE' });
      
      // İşlemi tamamla
      await client.query('COMMIT');
      
      return NextResponse.json(result);
    } catch (error) {
      // Hata durumunda geri al
      await client.query('ROLLBACK');
      console.error('Tablo oluşturma hatası:', error);
      return NextResponse.json(
        { error: 'Tablolar oluşturulurken bir hata oluştu', details: error },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    return NextResponse.json(
      { error: 'Veritabanına bağlanırken bir hata oluştu', details: error },
      { status: 500 }
    );
  }
} 