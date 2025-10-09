-- Ballim Database Setup SQL Commands
-- Supabase SQL Editor'de bu komutları çalıştır

-- 1. Müşteriler tablosu
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
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
);

-- 2. Ürünler tablosu
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

-- 3. Filamentler tablosu
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

-- 4. Ürün Filamentleri tablosu
CREATE TABLE IF NOT EXISTS product_filaments (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  filament_type VARCHAR(20) NOT NULL,
  filament_color VARCHAR(50) NOT NULL,
  filament_density VARCHAR(50),
  weight FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Siparişler tablosu
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

-- 6. Sipariş numarası sequence'leri
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS stock_order_number_seq START WITH 1000 INCREMENT BY 1;

-- 7. Sipariş Ürünleri tablosu
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

-- 8. Stok tablosu
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Stok Düşme Logları tablosu
CREATE TABLE IF NOT EXISTS stock_reductions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  notes TEXT,
  reduction_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Filament Kullanım Geçmişi tablosu
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

-- 11. Müşteri Filament Fiyatları tablosu
CREATE TABLE IF NOT EXISTS customer_filament_prices (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  filament_type VARCHAR(50) NOT NULL,
  price_per_gram FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Filament Alımları tablosu
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

-- 13. Toptan Satış Fiyat Aralıkları tablosu
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

-- 14. Müşteri kategorisi ve iskonto kolonları ekle (var olan tablolar için)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS customer_category VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS discount_rate FLOAT DEFAULT 0;

-- 15. Sistem müşterisi oluştur (stok üretimleri için)
INSERT INTO customers (customer_code, name, phone, email, customer_type, customer_category, username, password) 
VALUES ('STOK-001', 'STOK', '0000000000', 'stok@ballim.com', 'Kurumsal', 'normal', 'stok', 'stok123')
ON CONFLICT (username) DO NOTHING;

-- 16. Bazı örnek filament verileri ekle
INSERT INTO filaments (filament_code, name, type, brand, color, location, total_weight, remaining_weight, quantity, critical_stock, temp_range, cap, price_per_gram) VALUES
('pla-beyaz-001', 'PLA Beyaz', 'PLA', 'Generic', 'Beyaz', 'Raf A', 1000, 1000, 1, 200, '190-220', '0.4', 0.02),
('pla-siyah-002', 'PLA Siyah', 'PLA', 'Generic', 'Siyah', 'Raf A', 1000, 800, 1, 200, '190-220', '0.4', 0.02),
('pla-kirmizi-003', 'PLA Kırmızı', 'PLA', 'Generic', 'Kırmızı', 'Raf B', 1000, 1000, 1, 200, '190-220', '0.4', 0.02)
ON CONFLICT (filament_code) DO NOTHING;

-- 17. Bazı örnek ürün verileri ekle
INSERT INTO products (product_code, product_type, capacity, total_gram, piece_gram, notes) VALUES
('book-nook-001', 'Book Nook', 10, 100, 10, 'Kitap köşesi tasarımı'),
('f1-model-002', 'F1 Model', 5, 50, 10, 'Formula 1 modeli'),
('anahtarlik-003', 'Anahtarlık', 20, 40, 2, 'Uludağ anahtarlık')
ON CONFLICT (product_code) DO NOTHING;

-- 18. Ürün filament ilişkileri ekle
INSERT INTO product_filaments (product_id, filament_type, filament_color, filament_density, weight) VALUES
(1, 'PLA', 'Beyaz', '1.24', 10),
(1, 'PLA', 'Siyah', '1.24', 5),
(2, 'PLA', 'Kırmızı', '1.24', 10),
(3, 'PLA', 'Beyaz', '1.24', 2)
ON CONFLICT DO NOTHING;

-- 19. Başlangıç stok verileri ekle
INSERT INTO inventory (product_id, quantity) VALUES
(1, 0),
(2, 0),
(3, 0)
ON CONFLICT (product_id) DO NOTHING;

-- 20. Toptan satış fiyat aralıkları ekle
INSERT INTO wholesale_price_ranges (min_gram, max_gram, price) VALUES
(0, 100, 0.05),
(101, 500, 0.04),
(501, 1000, 0.03),
(1001, 9999, 0.025)
ON CONFLICT (min_gram, max_gram) DO NOTHING;

-- Başarı mesajı
SELECT 'Tüm tablolar başarıyla oluşturuldu ve örnek veriler eklendi!' as message;
