const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ballim',
  password: 'ballim146161',
  port: 5432,
});

async function deletePayments() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('DELETE FROM odemeler');
    await client.query('COMMIT');
    console.log(`${result.rowCount} ödeme kaydı silindi.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Hata:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

deletePayments(); 