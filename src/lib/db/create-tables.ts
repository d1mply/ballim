import type { QueryResult } from 'pg';

type QueryFn = (
  text: string,
  params?: (string | number | boolean | null)[]
) => Promise<QueryResult>;
export async function createTables(query: QueryFn) {
  let success = true;
  
  // MÃ¼ÅŸteriler tablosu
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
    console.log('Customers tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Customers tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // ÃœrÃ¼nler tablosu
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
    console.log('Products tablosu oluÅŸturuldu veya zaten mevcut');

    // Var olan tabloya yeni kolonlarÄ± ekle
    await query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(50)
    `);
  } catch (error) {
    console.error('Products tablosu oluÅŸturulurken hata:', error);
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
    console.log('Filaments tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Filaments tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // ÃœrÃ¼n Filamentleri tablosu
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
    console.log('Product Filaments tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Product Filaments tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // SipariÅŸler tablosu
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
    console.log('Orders tablosu oluÅŸturuldu veya zaten mevcut');
    
    // SipariÅŸ numarasÄ± iÃ§in sequence'ler oluÅŸtur
    try {
      // Normal sipariÅŸ sequence
      await query(`
        CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1
      `);
      console.log('SipariÅŸ numarasÄ± sequence oluÅŸturuldu');
      
      // Stok Ã¼retim sequence
      await query(`
        CREATE SEQUENCE IF NOT EXISTS stock_order_number_seq START WITH 1000 INCREMENT BY 1
      `);
      console.log('Stok Ã¼retim numarasÄ± sequence oluÅŸturuldu');
    } catch (seqError) {
      console.log('Sequence zaten mevcut veya oluÅŸturuldu');
    }
  } catch (error) {
    console.error('Orders tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // SipariÅŸ ÃœrÃ¼nleri tablosu
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
    console.log('Order Items tablosu oluÅŸturuldu veya zaten mevcut');
    
    // Mevcut tabloyu gÃ¼ncelle - product_code, product_name, status ve package_id alanlarÄ±nÄ± ekle
    await query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS product_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS product_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'onay_bekliyor',
      ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES product_packages(id) ON DELETE SET NULL
    `);
    console.log('Order Items tablosu gÃ¼ncellenmiÅŸ alanlar eklendi');
    
    // Mevcut kayÄ±tlarÄ±n boÅŸ product_code ve product_name alanlarÄ±nÄ± doldur
    await query(`
      UPDATE order_items oi
      SET 
        product_code = p.product_code,
        product_name = p.product_type
      FROM products p
      WHERE oi.product_id = p.id 
        AND (oi.product_code IS NULL OR oi.product_code = '')
    `);
    console.log('Mevcut order_items kayÄ±tlarÄ± Ã¼rÃ¼n bilgileriyle gÃ¼ncellendi');
    
    // Mevcut kayÄ±tlarÄ±n status alanÄ±nÄ± gÃ¼ncelle (eÄŸer NULL ise)
    await query(`
      UPDATE order_items 
      SET status = 'onay_bekliyor'
      WHERE status IS NULL
    `);
    console.log('Order Items status alanlarÄ± gÃ¼ncellendi');
    
    // SilinmiÅŸ Ã¼rÃ¼nlerin bilgilerini de gÃ¼ncelle (product_id NULL olanlar iÃ§in varsayÄ±lan deÄŸerler)
    await query(`
      UPDATE order_items 
      SET 
        product_code = COALESCE(product_code, 'ÃœRÃœN-' || id),
        product_name = COALESCE(product_name, 'SipariÅŸ ÃœrÃ¼nÃ¼ #' || id)
      WHERE (product_code IS NULL OR product_code = '') 
        AND product_id IS NULL
    `);
    console.log('SilinmiÅŸ Ã¼rÃ¼n kayÄ±tlarÄ± iÃ§in varsayÄ±lan bilgiler eklendi');
  } catch (error) {
    console.error('Order Items tablosu oluÅŸturulurken hata:', error);
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
    console.log('Inventory tablosu oluÅŸturuldu veya zaten mevcut');
    
    // Unique constraint ekle (yalnÄ±zca yoksa â€” idempotent, gereksiz hata logu Ã¼retmez)
    try {
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_id_key'
          ) THEN
            ALTER TABLE inventory ADD CONSTRAINT inventory_product_id_key UNIQUE (product_id);
          END IF;
        END$$;
      `);
    } catch (constraintError) {
      console.log('Inventory unique constraint zaten mevcut veya eklendi');
    }
    
    // created_at kolonunu ekle (var olan tablolar iÃ§in)
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
    console.error('Inventory tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // Stok DÃ¼ÅŸme LoglarÄ± tablosu
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
    console.log('Stock Reductions tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Stock Reductions tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // Filament KullanÄ±m GeÃ§miÅŸi tablosu
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
    console.log('Filament Usage tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Filament Usage tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // MÃ¼ÅŸteri Filament FiyatlarÄ± tablosu
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
    console.log('Customer Filament Prices tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Customer Filament Prices tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // Filament AlÄ±mlarÄ± tablosu
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
    console.log('Filament Purchases tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Filament Purchases tablosu oluÅŸturulurken hata:', error);
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
    console.log('Cari Hesap tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Cari Hesap tablosu oluÅŸturulurken hata:', error);
    success = false;
  }
  
  // Ã–demeler tablosu
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
        durum VARCHAR(20) NOT NULL DEFAULT 'Ã–dendi',
        aciklama TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Ã–demeler tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Ã–demeler tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // ToptancÄ± Gram AralÄ±ÄŸÄ± FiyatlarÄ± tablosu
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
    console.log('Wholesale Price Ranges tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Wholesale Price Ranges tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // Customers tablosuna toptancÄ± alanlarÄ± ekle (gÃ¼venli ÅŸekilde)
  try {
    // customer_category sÃ¼tunu kontrol et ve ekle
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
      console.log('customers tablosuna customer_category sÃ¼tunu eklendi');
    }

    // discount_rate sÃ¼tunu kontrol et ve ekle
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
      console.log('customers tablosuna discount_rate sÃ¼tunu eklendi');
    }

  } catch (error) {
    console.error('Customers tablosu toptancÄ± alanlarÄ± eklenirken hata:', error);
    success = false;
  }

  // VarsayÄ±lan gram aralÄ±ÄŸÄ± fiyatlarÄ±nÄ± ekle
  try {
    const checkPriceRanges = await query(`
      SELECT COUNT(*) FROM wholesale_price_ranges
    `);

    if (parseInt(checkPriceRanges.rows[0].count) === 0) {
      // BaÅŸlangÄ±Ã§ gram aralÄ±ÄŸÄ± fiyatlarÄ±nÄ± ekle
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
      
      console.log('VarsayÄ±lan gram aralÄ±ÄŸÄ± fiyatlarÄ± eklendi');
    }
  } catch (error) {
    console.error('VarsayÄ±lan gram aralÄ±ÄŸÄ± fiyatlarÄ± eklenirken hata:', error);
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
    console.log('Product Packages tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Product Packages tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // Paket iÃ§indeki Ã¼rÃ¼nler tablosu
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
    console.log('Package Items tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Package Items tablosu oluÅŸturulurken hata:', error);
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
    console.log('Audit Logs tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Audit Logs tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // Favori Ã¼rÃ¼nler tablosu
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
    console.log('Favorite Products tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Favorite Products tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // RBAC: Roles tablosu
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        permissions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      INSERT INTO roles (name, permissions) VALUES
        ('super_admin', '["*"]'),
        ('admin', '["products.*","orders.*","customers.*","inventory.*","filaments.*","payments.*","reports.*"]'),
        ('sales', '["orders.read","orders.create","customers.read","products.read","quotes.create"]'),
        ('warehouse', '["inventory.*","filaments.*","orders.read","production.*"]'),
        ('accountant', '["payments.*","customers.read","orders.read","reports.*","cari.*"]')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('Roles tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Roles tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // RBAC: Users tablosu (admin tarafÄ± kullanÄ±cÄ±larÄ±)
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(255),
        role_id INTEGER REFERENCES roles(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)
    `);
    console.log('Users tablosu oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Users tablosu oluÅŸturulurken hata:', error);
    success = false;
  }

  // Sistem mÃ¼ÅŸterisi oluÅŸtur (stok Ã¼retimleri iÃ§in)
  try {
    await query(`
      INSERT INTO customers (customer_code, name, phone, email, customer_type, customer_category, username, password) 
      VALUES ('STOK-001', 'STOK', '0000000000', 'stok@ballim.com', 'Kurumsal', 'normal', 'stok', 'stok123')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('Sistem mÃ¼ÅŸterisi (STOK) oluÅŸturuldu veya zaten mevcut');
  } catch (error) {
    console.error('Sistem mÃ¼ÅŸterisi oluÅŸturulurken hata:', error);
    success = false;
  }

  // ğŸš€ PERFORMANS: Database Index'leri Ekleme (Query performansÄ± iÃ§in kritik)
  try {
    // Products tablosu index'leri
    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type)
    `);
    console.log('Products tablosu index\'leri oluÅŸturuldu veya zaten mevcut');

    // Product Filaments tablosu index'leri
    await query(`
      CREATE INDEX IF NOT EXISTS idx_product_filaments_product_id ON product_filaments(product_id)
    `);
    console.log('Product Filaments tablosu index\'leri oluÅŸturuldu veya zaten mevcut');

    // Inventory tablosu index'leri
    await query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id)
    `);
    console.log('Inventory tablosu index\'leri oluÅŸturuldu veya zaten mevcut');

    // Order Items tablosu index'leri (stok hesaplama iÃ§in kritik)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_product_status ON order_items(product_id, status)
    `);
    console.log('Order Items tablosu index\'leri oluÅŸturuldu veya zaten mevcut');

    // Orders tablosu index'leri
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)
    `);
    console.log('Orders tablosu index\'leri oluÅŸturuldu veya zaten mevcut');

    // Cari hesap index'leri
    await query(`CREATE INDEX IF NOT EXISTS idx_cari_hesap_musteri_id ON cari_hesap(musteri_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_cari_hesap_created_at ON cari_hesap(created_at DESC)`);

    // Odemeler index'leri
    await query(`CREATE INDEX IF NOT EXISTS idx_odemeler_musteri_id ON odemeler(musteri_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_odemeler_siparis_id ON odemeler(siparis_id)`);

    // Customer index'leri
    await query(`CREATE INDEX IF NOT EXISTS idx_customers_username ON customers(username)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code)`);

    // Filament index'leri
    await query(`CREATE INDEX IF NOT EXISTS idx_filaments_filament_code ON filaments(filament_code)`);

    // Customer filament prices
    await query(`CREATE INDEX IF NOT EXISTS idx_customer_filament_prices_customer ON customer_filament_prices(customer_id)`);

    // Wholesale price ranges
    await query(`CREATE INDEX IF NOT EXISTS idx_wholesale_price_ranges_active ON wholesale_price_ranges(is_active)`);

    // Package items
    await query(`CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(package_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_package_items_product_id ON package_items(product_id)`);
  } catch (indexError) {
    console.error('Index\'ler oluÅŸturulurken hata:', indexError);
    // Index hatalarÄ± tablo oluÅŸturmayÄ± engellemez
  }

  if (success) {
    console.log('TÃ¼m tablolar baÅŸarÄ±yla oluÅŸturuldu veya zaten mevcuttu');
  } else {
    console.warn('BazÄ± tablolar oluÅŸturulurken hatalar oluÅŸtu, lÃ¼tfen loglarÄ± kontrol edin');
  }
  
  return success;
}
