const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ballim',
  password: 'ballim146161',
  port: 5432,
});

async function fixTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Önce odemeler tablosunu sil
    await client.query('DROP TABLE IF EXISTS odemeler CASCADE');

    // Yeni odemeler tablosunu oluştur
    await client.query(`
      CREATE TABLE odemeler (
        id SERIAL PRIMARY KEY,
        musteri_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        siparis_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        odeme_tarihi DATE NOT NULL,
        tutar NUMERIC(10, 2) NOT NULL,
        odeme_yontemi VARCHAR(100) NOT NULL,
        vade_ay INTEGER,
        durum VARCHAR(50) NOT NULL DEFAULT 'Ödendi',
        aciklama TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Ödemeler tablosu başarıyla yeniden oluşturuldu.');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Hata:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixTables(); 