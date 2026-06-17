-- =====================================================
-- BALLIM - VERİTABANI TEMİZLİK SCRİPTİ
-- Supabase SQL Editor'e kopyala ve çalıştır
-- =====================================================
-- KORUNANLAR : STOK-001 müşterisi, system_settings, wholesale_price_ranges
-- SİLİNENLER : Ürünler, filamentler, müşteriler, siparişler, ödemeler,
--              cari hesap, paketler, favoriler, audit loglar
-- =====================================================

BEGIN;

-- ------------------------------------------------
-- ADIM 1: En alt katman (başka tablolara referans vermeyenler)
-- ------------------------------------------------
DELETE FROM filament_usage;
DELETE FROM filament_purchases;
DELETE FROM stock_reductions;
DELETE FROM customer_filament_prices;
DELETE FROM audit_logs;

-- ------------------------------------------------
-- ADIM 2: Sipariş ve ödeme alt tabloları
-- ------------------------------------------------
DELETE FROM order_items;
DELETE FROM cari_hesap;
DELETE FROM odemeler;

-- ------------------------------------------------
-- ADIM 3: Ana bağımlı tablolar
-- ------------------------------------------------
DELETE FROM orders;
DELETE FROM inventory;
DELETE FROM product_filaments;

-- ------------------------------------------------
-- ADIM 4: Ana tablolar
-- ------------------------------------------------
DELETE FROM products;
DELETE FROM filaments;

-- Müşteriler: STOK-001 KORUNUYOR
DELETE FROM customers WHERE customer_code != 'STOK-001';

-- ------------------------------------------------
-- ADIM 5: Sequence sıfırlama (yeni kayıtlar 1'den başlasın)
-- ------------------------------------------------
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE filaments_id_seq RESTART WITH 1;
ALTER SEQUENCE customers_id_seq RESTART WITH 2;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE inventory_id_seq RESTART WITH 1;
ALTER SEQUENCE product_filaments_id_seq RESTART WITH 1;
ALTER SEQUENCE filament_usage_id_seq RESTART WITH 1;
ALTER SEQUENCE filament_purchases_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_reductions_id_seq RESTART WITH 1;
ALTER SEQUENCE customer_filament_prices_id_seq RESTART WITH 1;
ALTER SEQUENCE odemeler_id_seq RESTART WITH 1;
ALTER SEQUENCE cari_hesap_id_seq RESTART WITH 1;
ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1;

-- Sipariş numarası counter'larını da sıfırla
ALTER SEQUENCE order_number_seq RESTART WITH 1000;
ALTER SEQUENCE stock_order_number_seq RESTART WITH 1000;

COMMIT;

-- ------------------------------------------------
-- DOĞRULAMA: Temizlik sonrası kayıt sayıları
-- ------------------------------------------------
SELECT
  'musteri'            AS tablo, COUNT(*) AS kayit FROM customers
UNION ALL SELECT 'urun',         COUNT(*) FROM products
UNION ALL SELECT 'filament',     COUNT(*) FROM filaments
UNION ALL SELECT 'siparis',      COUNT(*) FROM orders
UNION ALL SELECT 'stok',         COUNT(*) FROM inventory
UNION ALL SELECT 'odeme',        COUNT(*) FROM odemeler
UNION ALL SELECT 'cari_hesap',   COUNT(*) FROM cari_hesap
UNION ALL SELECT 'sistem_ayari', COUNT(*) FROM system_settings
UNION ALL SELECT 'toptan_fiyat', COUNT(*) FROM wholesale_price_ranges
ORDER BY tablo;
