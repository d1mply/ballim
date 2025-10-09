-- BALLIM - Minimal Hatasız Kurulum
-- Supabase SQL Editor'e kopyala ve çalıştır

-- 1. TABLOLAR (Sadece temel, örnek veri YOK)
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
  customer_category VARCHAR(20) DEFAULT 'normal',
  discount_rate FLOAT DEFAULT 0,
  username VARCHAR(50) UNIQUE,
  password VARCHAR(100),
  orders_count INTEGER DEFAULT 0,
  total_spent FLOAT DEFAULT 0,
  last_order_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

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
);

CREATE TABLE IF NOT EXISTS product_filaments (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  filament_type VARCHAR(20) NOT NULL,
  filament_color VARCHAR(50) NOT NULL,
  filament_density VARCHAR(50),
  weight FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS stock_order_number_seq START WITH 1000 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_code VARCHAR(20),
  product_name VARCHAR(100),
  quantity INTEGER NOT NULL,
  unit_price FLOAT NOT NULL,
  status VARCHAR(20) DEFAULT 'onay_bekliyor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_reductions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  notes TEXT,
  reduction_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS filament_usage (
  id SERIAL PRIMARY KEY,
  filament_id INTEGER REFERENCES filaments(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  usage_date DATE NOT NULL,
  amount FLOAT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_filament_prices (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  filament_type VARCHAR(50) NOT NULL,
  price_per_gram FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS filament_purchases (
  id SERIAL PRIMARY KEY,
  filament_id INTEGER REFERENCES filaments(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price FLOAT NOT NULL,
  total_price FLOAT NOT NULL,
  supplier VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wholesale_price_ranges (
  id SERIAL PRIMARY KEY,
  min_gram FLOAT NOT NULL,
  max_gram FLOAT NOT NULL,
  price FLOAT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(min_gram, max_gram)
);

-- 2. SADECE ZORUNLU VERİ: Sistem Müşterisi
INSERT INTO customers (customer_code, name, phone, email, customer_type, customer_category, username, password) 
VALUES ('STOK-001', 'STOK', '0000000000', 'stok@ballim.com', 'Kurumsal', 'normal', 'stok', 'stok123')
ON CONFLICT (username) DO NOTHING;

-- BAŞARI MESAJI
SELECT 'Tablolar başarıyla oluşturuldu! Şimdi uygulamayı test edebilirsin.' as message;

