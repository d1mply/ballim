import { Pool } from 'pg';

// Veritabanı bağlantı bilgileri
export const pool = new Pool(
  // Render'da DATABASE_URL varsa onu kullan, yoksa individual env variables kullan
  process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL + (
      process.env.DATABASE_URL.includes('?') ? '&sslmode=require' : '?sslmode=require'
    ),
    ssl: {
      rejectUnauthorized: false
    },
    // Connection pool optimization
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  } : {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    // Local development'ta SSL false, aksi halde SSL aktif
    ssl: process.env.NODE_ENV === 'development' ? false : {
      rejectUnauthorized: false
    },
    // Connection pool optimization
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  }
);

// Connection test fonksiyonu
export async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Veritabanı bağlantısı başarılı');
    return true;
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error);
    return false;
  }
}

// Sorgu çalıştırma yardımcı fonksiyonu
export async function query(text: string, params?: (string | number | boolean | null)[]) {
  const start = Date.now();
  try {
    // Production'da log seviyesini azalt
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sorgu başlatılıyor:', { text, params });
      console.log('Veritabanı bilgileri:', {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        hasDatabase_URL: !!process.env.DATABASE_URL
      });
    }
    
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Sorgu çalıştırıldı', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Sorgu hatası:', {
      error: error.message,
      query: text,
      params: params,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Veritabanı şemalarını oluşturma
export async function createTables() {
  let success = true;
  
  // Müşteriler tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        customer_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        company VARCHAR(100),
        tax_number VARCHAR(20),
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        address TEXT,
        customer_type VARCHAR(20) NOT NULL DEFAULT 'Bireysel',
        username VARCHAR(50) UNIQUE,
        password VARCHAR(100),
        orders_count INTEGER DEFAULT 0,
        total_spent FLOAT DEFAULT 0,
        last_order_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Customers tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Customers tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Ürünler tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_code VARCHAR(50) UNIQUE NOT NULL,
        product_type VARCHAR(50) NOT NULL,
        image_path TEXT,
        capacity INTEGER NOT NULL,
        dimension_x FLOAT,
        dimension_y FLOAT,
        dimension_z FLOAT,
        print_time INTEGER,
        total_gram FLOAT NOT NULL,
        piece_gram FLOAT NOT NULL,
        file_path TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Products tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Products tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Filamentler tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS filaments (
        id SERIAL PRIMARY KEY,
        filament_code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        brand VARCHAR(50) NOT NULL,
        color VARCHAR(50) NOT NULL,
        location VARCHAR(100),
        total_weight FLOAT NOT NULL,
        remaining_weight FLOAT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        critical_stock FLOAT NOT NULL DEFAULT 200,
        temp_range VARCHAR(20),
        cap VARCHAR(10),
        price_per_gram FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Filaments tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Filaments tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Ürün Filamentleri tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS product_filaments (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        filament_type VARCHAR(20) NOT NULL,
        filament_color VARCHAR(50) NOT NULL,
        filament_density VARCHAR(50),
        weight FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Product Filaments tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Product Filaments tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Siparişler tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_code VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        order_date DATE NOT NULL,
        total_amount FLOAT NOT NULL,
        status VARCHAR(20) NOT NULL,
        payment_status VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Orders tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Orders tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Sipariş Ürünleri tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_code VARCHAR(20),
        product_name VARCHAR(100),
        quantity INTEGER NOT NULL,
        unit_price FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Order Items tablosu oluşturuldu veya zaten mevcut');
    
    // Mevcut tabloyu güncelle - product_code ve product_name alanlarını ekle
    await query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS product_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS product_name VARCHAR(100)
    `);
    console.log('Order Items tablosu güncellenmiş alanlar eklendi');
    
    // Mevcut kayıtların boş product_code ve product_name alanlarını doldur
    await query(`
      UPDATE order_items oi
      SET 
        product_code = p.product_code,
        product_name = p.product_type
      FROM products p
      WHERE oi.product_id = p.id 
        AND (oi.product_code IS NULL OR oi.product_code = '')
    `);
    console.log('Mevcut order_items kayıtları ürün bilgileriyle güncellendi');
    
    // Silinmiş ürünlerin bilgilerini de güncelle (product_id NULL olanlar için varsayılan değerler)
    await query(`
      UPDATE order_items 
      SET 
        product_code = COALESCE(product_code, 'ÜRÜN-' || id),
        product_name = COALESCE(product_name, 'Sipariş Ürünü #' || id)
      WHERE (product_code IS NULL OR product_code = '') 
        AND product_id IS NULL
    `);
    console.log('Silinmiş ürün kayıtları için varsayılan bilgiler eklendi');
  } catch (error) {
    console.error('Order Items tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Stok tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Inventory tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Inventory tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Filament Kullanım Geçmişi tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS filament_usage (
        id SERIAL PRIMARY KEY,
        filament_id INTEGER REFERENCES filaments(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        usage_date DATE NOT NULL,
        amount FLOAT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Filament Usage tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Filament Usage tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Müşteri Filament Fiyatları tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS customer_filament_prices (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        filament_type VARCHAR(50) NOT NULL,
        price_per_gram FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Customer Filament Prices tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Customer Filament Prices tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Filament Alımları tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS filament_purchases (
        id SERIAL PRIMARY KEY,
        filament_id INTEGER REFERENCES filaments(id) ON DELETE CASCADE,
        purchase_date DATE NOT NULL,
        amount_gram FLOAT NOT NULL,
        purchase_price FLOAT NOT NULL,
        price_per_gram FLOAT NOT NULL,
        supplier VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Filament Purchases tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Filament Purchases tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Cari Hesap tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS cari_hesap (
        id SERIAL PRIMARY KEY,
        musteri_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        tarih DATE NOT NULL,
        aciklama TEXT NOT NULL,
        islem_turu VARCHAR(20) NOT NULL,
        tutar FLOAT NOT NULL,
        odeme_yontemi VARCHAR(30),
        siparis_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        bakiye FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Cari Hesap tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Cari Hesap tablosu oluşturulurken hata:', error);
    success = false;
  }
  
  // Ödemeler tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS odemeler (
        id SERIAL PRIMARY KEY,
        musteri_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        siparis_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        odeme_tarihi DATE NOT NULL,
        tutar FLOAT NOT NULL,
        odeme_yontemi VARCHAR(30) NOT NULL,
        vade_ay INTEGER,
        durum VARCHAR(20) NOT NULL DEFAULT 'Ödendi',
        aciklama TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Ödemeler tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Ödemeler tablosu oluşturulurken hata:', error);
    success = false;
  }

  if (success) {
    console.log('Tüm tablolar başarıyla oluşturuldu veya zaten mevcuttu');
  } else {
    console.warn('Bazı tablolar oluşturulurken hatalar oluştu, lütfen logları kontrol edin');
  }
  
  return success;
}

// Tabloları sadece bir kez oluştur - development modunda
if (process.env.NODE_ENV === 'development') {
  let tablesCreated = false;
  if (!tablesCreated) {
    createTables()
      .then(() => {
        tablesCreated = true;
        console.log('Tablolar başarıyla oluşturuldu');
      })
      .catch(console.error);
  }
}

// db objesi - eski kodlar için uyumluluk
export const db = {
  query
}; 