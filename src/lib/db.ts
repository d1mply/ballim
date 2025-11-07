import { Pool } from 'pg';

// Veritabanı bağlantı bilgileri
export const pool = new Pool(
  // Render'da DATABASE_URL varsa onu kullan, yoksa individual env variables kullan
  // DATABASE_URL'in direkt kullanılmasını sağlıyorum, fazladan SSL parametresi eklenmesini engelliyorum.
  // process.env.DATABASE_URL.includes('?') ? '&sslmode=require' : '?sslmode=require'
  process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: false,
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
        barcode VARCHAR(50),
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

    // Var olan tabloya yeni kolonları ekle
    await query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(50)
    `);
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
    
    // Sipariş numarası için sequence'ler oluştur
    try {
      // Normal sipariş sequence
      await query(`
        CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1
      `);
      console.log('Sipariş numarası sequence oluşturuldu');
      
      // Stok üretim sequence
      await query(`
        CREATE SEQUENCE IF NOT EXISTS stock_order_number_seq START WITH 1000 INCREMENT BY 1
      `);
      console.log('Stok üretim numarası sequence oluşturuldu');
    } catch (seqError) {
      console.log('Sequence zaten mevcut veya oluşturuldu');
    }
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
        package_id INTEGER REFERENCES product_packages(id) ON DELETE SET NULL,
        product_code VARCHAR(20),
        product_name VARCHAR(100),
        quantity INTEGER NOT NULL,
        unit_price FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Order Items tablosu oluşturuldu veya zaten mevcut');
    
    // Mevcut tabloyu güncelle - product_code, product_name, status ve package_id alanlarını ekle
    await query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS product_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS product_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'onay_bekliyor',
      ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES product_packages(id) ON DELETE SET NULL
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
    
    // Mevcut kayıtların status alanını güncelle (eğer NULL ise)
    await query(`
      UPDATE order_items 
      SET status = 'onay_bekliyor'
      WHERE status IS NULL
    `);
    console.log('Order Items status alanları güncellendi');
    
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
        product_id INTEGER UNIQUE REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Inventory tablosu oluşturuldu veya zaten mevcut');
    
    // Unique constraint ekle (tablo zaten mevcutsa)
    try {
      await query(`
        ALTER TABLE inventory 
        ADD CONSTRAINT inventory_product_id_key UNIQUE (product_id)
      `);
      console.log('Inventory tablosuna unique constraint eklendi');
    } catch (constraintError) {
      // Constraint zaten varsa hata almayı görmezden gel
      console.log('Inventory unique constraint zaten mevcut veya eklendi');
    }
    
    // created_at kolonunu ekle (var olan tablolar için)
    try {
      await query(`
        ALTER TABLE inventory 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('Inventory tablosuna created_at kolonu eklendi');
    } catch (columnError) {
      console.log('Inventory created_at kolonu zaten mevcut');
    }
  } catch (error) {
    console.error('Inventory tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Stok Düşme Logları tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS stock_reductions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        reason VARCHAR(100) NOT NULL,
        notes TEXT,
        reduction_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Stock Reductions tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Stock Reductions tablosu oluşturulurken hata:', error);
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

  // Toptancı Gram Aralığı Fiyatları tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS wholesale_price_ranges (
        id SERIAL PRIMARY KEY,
        min_gram FLOAT NOT NULL,
        max_gram FLOAT NOT NULL,
        price FLOAT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(min_gram, max_gram)
      )
    `);
    console.log('Wholesale Price Ranges tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Wholesale Price Ranges tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Customers tablosuna toptancı alanları ekle (güvenli şekilde)
  try {
    // customer_category sütunu kontrol et ve ekle
    const checkCategoryColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      AND column_name = 'customer_category'
    `);

    if (checkCategoryColumn.rowCount === 0) {
      await query(`
        ALTER TABLE customers 
        ADD COLUMN customer_category VARCHAR(20) DEFAULT 'normal'
      `);
      console.log('customers tablosuna customer_category sütunu eklendi');
    }

    // discount_rate sütunu kontrol et ve ekle
    const checkDiscountColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      AND column_name = 'discount_rate'
    `);

    if (checkDiscountColumn.rowCount === 0) {
      await query(`
        ALTER TABLE customers 
        ADD COLUMN discount_rate FLOAT DEFAULT 0
      `);
      console.log('customers tablosuna discount_rate sütunu eklendi');
    }

  } catch (error) {
    console.error('Customers tablosu toptancı alanları eklenirken hata:', error);
    success = false;
  }

  // Varsayılan gram aralığı fiyatlarını ekle
  try {
    const checkPriceRanges = await query(`
      SELECT COUNT(*) FROM wholesale_price_ranges
    `);

    if (parseInt(checkPriceRanges.rows[0].count) === 0) {
      // Başlangıç gram aralığı fiyatlarını ekle
      const defaultRanges = [
        { min: 0, max: 15, price: 25 },
        { min: 15, max: 30, price: 40 },
        { min: 30, max: 50, price: 60 }
      ];

      for (const range of defaultRanges) {
        await query(`
          INSERT INTO wholesale_price_ranges (min_gram, max_gram, price)
          VALUES ($1, $2, $3)
        `, [range.min, range.max, range.price]);
      }
      
      console.log('Varsayılan gram aralığı fiyatları eklendi');
    }
  } catch (error) {
    console.error('Varsayılan gram aralığı fiyatları eklenirken hata:', error);
    success = false;
  }

  // Paketler tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS product_packages (
        id SERIAL PRIMARY KEY,
        package_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price FLOAT NOT NULL,
        image_path TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Product Packages tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Product Packages tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Paket içindeki ürünler tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS package_items (
        id SERIAL PRIMARY KEY,
        package_id INTEGER REFERENCES product_packages(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Package Items tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Package Items tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Audit Log tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        user_name TEXT,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id TEXT,
        entity_name TEXT,
        details JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)
    `);
    console.log('Audit Logs tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Audit Logs tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Favori ürünler tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS favorite_products (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, product_id)
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_favorite_products_customer ON favorite_products(customer_id)
    `);
    console.log('Favorite Products tablosu oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Favorite Products tablosu oluşturulurken hata:', error);
    success = false;
  }

  // Sistem müşterisi oluştur (stok üretimleri için)
  try {
    await query(`
      INSERT INTO customers (customer_code, name, phone, email, customer_type, customer_category, username, password) 
      VALUES ('STOK-001', 'STOK', '0000000000', 'stok@ballim.com', 'Kurumsal', 'normal', 'stok', 'stok123')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('Sistem müşterisi (STOK) oluşturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Sistem müşterisi oluşturulurken hata:', error);
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
  createTables()
    .then(() => {
      console.log('Tablolar başarıyla oluşturuldu veya zaten mevcuttu');
    })
    .catch(console.error);
}

// db objesi - eski kodlar için uyumluluk
export const db = {
  query
}; 