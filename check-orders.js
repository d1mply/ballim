const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ballim',
  password: 'ballim146161',
  port: 5432,
});

async function checkOrders() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT order_code, customer_id, 
      (SELECT name FROM customers WHERE id = customer_id) as customer_name,
      created_at
      FROM orders 
      ORDER BY created_at ASC
    `);
    
    console.log('Sistemdeki siparişler:');
    result.rows.forEach(order => {
      console.log(`Sipariş Kodu: ${order.order_code}, Müşteri: ${order.customer_name}, Tarih: ${new Date(order.created_at).toLocaleString('tr-TR')}`);
    });
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkOrders(); 