const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ballim',
  password: 'ballim146161',
  port: 5432,
});

async function cleanAllData() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 VERİTABANI VERİ TEMİZLİĞİ BAŞLIYOR...\n');
    
    await client.query('BEGIN');
    
    // Sıralama önemli - Foreign key constraints nedeniyle
    const cleanupOrder = [
      { table: 'filament_usage', description: 'Filament kullanım kayıtları' },
      { table: 'filament_purchases', description: 'Filament alım kayıtları' },
      { table: 'customer_filament_prices', description: 'Müşteri filament fiyatları' },
      { table: 'cari_hesap', description: 'Cari hesap kayıtları' },
      { table: 'odemeler', description: 'Ödeme kayıtları' },
      { table: 'order_items', description: 'Sipariş ürün detayları' },
      { table: 'orders', description: 'Siparişler' },
      { table: 'inventory', description: 'Stok kayıtları' },
      { table: 'product_filaments', description: 'Ürün filament ilişkileri' },
      { table: 'products', description: 'Ürünler' },
      { table: 'filaments', description: 'Filamentler' },
      { table: 'customers', description: 'Müşteriler' }
    ];
    
    let totalDeleted = 0;
    
    for (const item of cleanupOrder) {
      try {
        const result = await client.query(`DELETE FROM ${item.table}`);
        const deletedCount = result.rowCount || 0;
        totalDeleted += deletedCount;
        
        if (deletedCount > 0) {
          console.log(`✅ ${item.description}: ${deletedCount} kayıt silindi`);
        } else {
          console.log(`⚪ ${item.description}: Zaten boş`);
        }
      } catch (error) {
        console.log(`⚠️  ${item.description}: ${error.message}`);
      }
    }
    
    // SERIAL sequence'leri sıfırla
    console.log('\n🔄 SEQUENCE\'LER SIFIRLANYOR...');
    const sequences = [
      'customers_id_seq',
      'products_id_seq', 
      'filaments_id_seq',
      'orders_id_seq',
      'order_items_id_seq',
      'inventory_id_seq',
      'product_filaments_id_seq',
      'filament_usage_id_seq',
      'filament_purchases_id_seq',
      'customer_filament_prices_id_seq',
      'cari_hesap_id_seq',
      'odemeler_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await client.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
        console.log(`✅ ${seq} sıfırlandı`);
      } catch (error) {
        console.log(`⚠️  ${seq}: ${error.message}`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n🎉 TEMİZLİK TAMAMLANDI!`);
    console.log(`📊 Toplam ${totalDeleted} kayıt silindi`);
    console.log(`🔢 Tüm ID sequence'leri sıfırlandı`);
    console.log(`🗃️  Tablolar korundu, sadece veriler temizlendi\n`);
    
    console.log('✨ Veritabanı temiz ve test için hazır!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Temizlik sırasında hata:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Script'i çalıştır
cleanAllData()
  .then(() => {
    console.log('\n🏁 Script başarıyla tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script hatası:', error);
    process.exit(1);
  }); 