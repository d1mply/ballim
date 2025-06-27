const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ballim',
  password: 'ballim146161',
  port: 5432,
});

async function checkTables() {
  const client = await pool.connect();
  try {
    // orders tablosunun yapısını kontrol et
    console.log('Orders tablosu yapısı:');
    const ordersTable = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'orders';
    `);
    console.log(ordersTable.rows);

    // odemeler tablosunun yapısını kontrol et
    console.log('\nOdemeler tablosu yapısı:');
    const odemelerTable = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'odemeler';
    `);
    console.log(odemelerTable.rows);

    // Foreign key kısıtlamalarını kontrol et
    console.log('\nForeign key kısıtlamaları:');
    const foreignKeys = await client.query(`
      SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `);
    console.log(foreignKeys.rows);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables(); 