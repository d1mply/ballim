import { query, pool } from '@/lib/db';

export interface CreatePaymentData {
  musteri_id: number;
  siparis_id?: number | null;
  odeme_tarihi: string;
  tutar: number;
  odeme_yontemi: string;
  vade_ay?: number | null;
  durum?: string;
  aciklama?: string | null;
}

export async function getPayments(customerId?: number) {
  const baseQuery = `
    SELECT o.id, o.musteri_id, c.name as musteri_adi, o.siparis_id, o.odeme_tarihi,
           o.tutar, o.odeme_yontemi, o.vade_ay, o.durum, o.aciklama, o.created_at
    FROM odemeler o
    JOIN customers c ON o.musteri_id = c.id
  `;
  if (customerId) {
    const res = await query(baseQuery + ' WHERE o.musteri_id = $1 ORDER BY o.odeme_tarihi DESC', [customerId]);
    return res.rows;
  }
  const res = await query(baseQuery + ' ORDER BY o.odeme_tarihi DESC');
  return res.rows;
}

export async function createPayment(data: CreatePaymentData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const odemeRes = await client.query(
      `INSERT INTO odemeler (musteri_id, siparis_id, odeme_tarihi, tutar, odeme_yontemi, vade_ay, durum, aciklama)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.musteri_id,
        data.siparis_id ?? null,
        data.odeme_tarihi,
        data.tutar,
        data.odeme_yontemi,
        data.vade_ay ?? null,
        data.durum ?? 'Ödendi',
        data.aciklama ?? null
      ]
    );
    if (data.durum === 'Ödendi' && data.tutar > 0) {
      const bakiyeRes = await client.query(
        `SELECT bakiye FROM cari_hesap WHERE musteri_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
        [data.musteri_id]
      );
      const oncekiBakiye = bakiyeRes.rows[0] ? parseFloat(bakiyeRes.rows[0].bakiye) : 0;
      const yeniBakiye = oncekiBakiye - data.tutar;
      await client.query(
        `INSERT INTO cari_hesap (musteri_id, tarih, aciklama, islem_turu, tutar, odeme_yontemi, siparis_id, bakiye)
         VALUES ($1, $2, $3, 'Tahsilat', $4, $5, $6, $7)`,
        [data.musteri_id, data.odeme_tarihi, data.aciklama ?? 'Ödeme alındı', data.tutar, data.odeme_yontemi, data.siparis_id ?? null, yeniBakiye]
      );
    }
    await client.query('COMMIT');
    return odemeRes.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getOverduePayments() {
  const res = await query(
    `SELECT o.*, c.name as musteri_adi
     FROM odemeler o
     JOIN customers c ON o.musteri_id = c.id
     WHERE o.durum = 'Beklemede' AND o.odeme_tarihi < CURRENT_DATE
     ORDER BY o.odeme_tarihi ASC`
  );
  return res.rows;
}
