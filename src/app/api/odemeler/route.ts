import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Tüm ödemeleri getir
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const siparisId = url.searchParams.get('siparisId');
    
    let query = `
      SELECT 
        o.id, 
        o.musteri_id, 
        c.name as musteri_adi,
        o.siparis_id,
        o.odeme_tarihi, 
        o.tutar, 
        o.odeme_yontemi,
        o.vade_ay,
        o.durum,
        o.aciklama,
        o.created_at
      FROM odemeler o
      JOIN customers c ON o.musteri_id = c.id
    `;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (customerId) {
      conditions.push(`o.musteri_id = $${paramIndex}`);
      params.push(customerId);
      paramIndex++;
    }
    
    if (siparisId) {
      conditions.push(`o.siparis_id = $${paramIndex}`);
      params.push(siparisId);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ` ORDER BY o.odeme_tarihi DESC, o.created_at DESC`;
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(query, params);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Ödeme verilerini getirirken hata:', error);
    return NextResponse.json(
      { error: 'Ödeme verileri getirilemedi' },
      { status: 500 }
    );
  }
}

// Yeni ödeme ekle
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      musteri_id, 
      siparis_id,
      odeme_tarihi, 
      tutar, 
      odeme_yontemi,
      vade_ay,
      durum,
      aciklama
    } = data;
    
    // Zorunlu alan kontrolü
    if (!musteri_id || !odeme_tarihi || !odeme_yontemi) {
      return NextResponse.json(
        { error: 'Lütfen müşteri, ödeme tarihi ve ödeme yöntemini belirtin' },
        { status: 400 }
      );
    }

    // Tutar kontrolü
    if (tutar !== undefined && isNaN(parseFloat(tutar))) {
      return NextResponse.json(
        { error: 'Geçersiz tutar formatı' },
        { status: 400 }
      );
    }

    // Sipariş ID'sini düzelt (SIP- önekini kaldır)
    let processedSiparisId = null;
    if (siparis_id) {
      processedSiparisId = siparis_id.replace('SIP-', '');
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Yeni ödeme ekle
      const odemeResult = await client.query(
        `INSERT INTO odemeler (
          musteri_id, siparis_id, odeme_tarihi, tutar, 
          odeme_yontemi, vade_ay, durum, aciklama, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [
          musteri_id, 
          processedSiparisId,
          odeme_tarihi, 
          tutar || 0,
          odeme_yontemi,
          vade_ay || null,
          durum || 'Ödendi',
          aciklama || null
        ]
      );
      
      // Eğer ödeme tamamlandıysa cari hesaba da ekle
      if (durum === 'Ödendi' && tutar > 0) {
        // Müşterinin son bakiyesini al
        const sonBakiyeResult = await client.query(
          `SELECT bakiye FROM cari_hesap 
           WHERE musteri_id = $1 
           ORDER BY created_at DESC, id DESC LIMIT 1`,
          [musteri_id]
        );
        
        let oncekiBakiye = 0;
        if (sonBakiyeResult.rows.length > 0) {
          oncekiBakiye = parseFloat(sonBakiyeResult.rows[0].bakiye);
        }
        
        // Yeni bakiyeyi hesapla (Tahsilat olduğu için bakiyeden düşür)
        const yeniBakiye = oncekiBakiye - parseFloat(tutar);
        
        // Cari hesaba ekle
        await client.query(
          `INSERT INTO cari_hesap (
            musteri_id, tarih, aciklama, islem_turu, tutar, 
            odeme_yontemi, siparis_id, bakiye, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            musteri_id, 
            odeme_tarihi, 
            aciklama || 'Ödeme alındı',
            'Tahsilat', 
            tutar, 
            odeme_yontemi,
            processedSiparisId,
            yeniBakiye
          ]
        );
      }
      
      await client.query('COMMIT');
      
      // Ödeme ve cari hesap bilgilerini birlikte döndür
      const result = {
        odeme: odemeResult.rows[0],
        success: true,
        message: 'Ödeme başarıyla kaydedildi'
      };
      
      return NextResponse.json(result);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Ödeme eklenirken hata:', error);
    return NextResponse.json(
      { error: 'Ödeme eklenemedi: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    );
  }
}

// Bir ödemeyi güncelle
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      id,
      odeme_tarihi, 
      tutar, 
      odeme_yontemi,
      vade_ay,
      durum,
      aciklama
    } = data;
    
    if (!id || !odeme_tarihi || tutar === undefined || !odeme_yontemi) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik' },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Mevcut ödemeyi al
      const existingResult = await client.query(
        'SELECT * FROM odemeler WHERE id = $1',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Ödeme bulunamadı' },
          { status: 404 }
        );
      }
      
      const existingRecord = existingResult.rows[0];
      const eskiDurum = existingRecord.durum;
      const yeniDurum = durum || 'Ödendi';
      
      // Ödemeyi güncelle
      const updateResult = await client.query(
        `UPDATE odemeler SET
          odeme_tarihi = $1, tutar = $2, odeme_yontemi = $3, 
          vade_ay = $4, durum = $5, aciklama = $6
         WHERE id = $7
         RETURNING *`,
        [
          odeme_tarihi, 
          tutar, 
          odeme_yontemi, 
          vade_ay || null, 
          yeniDurum, 
          aciklama || null, 
          id
        ]
      );
      
      // Eğer ödeme durumu değiştiyse ve artık "Ödendi" ise cari hesaba ekle
      if (eskiDurum !== 'Ödendi' && yeniDurum === 'Ödendi') {
        await client.query(
          `INSERT INTO cari_hesap (
            musteri_id, tarih, aciklama, islem_turu, tutar, 
            odeme_yontemi, siparis_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            existingRecord.musteri_id, 
            odeme_tarihi, 
            aciklama || 'Ödeme alındı',
            'Tahsilat', 
            tutar, 
            odeme_yontemi,
            existingRecord.siparis_id || null
          ]
        );
        
        // Cari hesap bakiyelerini güncelle
        const bakiyeResult = await client.query(
          `SELECT id FROM cari_hesap 
           WHERE musteri_id = $1 
           ORDER BY created_at DESC, id DESC`,
          [existingRecord.musteri_id]
        );
        
        if (bakiyeResult.rows.length > 0) {
          let guncelBakiye = 0;
          
          for (const record of bakiyeResult.rows) {
            const cariHesapId = record.id;
            const cariHesapInfo = await client.query(
              'SELECT islem_turu, tutar FROM cari_hesap WHERE id = $1',
              [cariHesapId]
            );
            
            if (cariHesapInfo.rows.length > 0) {
              const { islem_turu, tutar } = cariHesapInfo.rows[0];
              
              if (islem_turu === 'Tahsilat') {
                guncelBakiye -= parseFloat(tutar);
              } else {
                guncelBakiye += parseFloat(tutar);
              }
              
              await client.query(
                'UPDATE cari_hesap SET bakiye = $1 WHERE id = $2',
                [guncelBakiye, cariHesapId]
              );
            }
          }
        }
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json(updateResult.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Ödeme güncellenirken hata:', error);
    return NextResponse.json(
      { error: 'Ödeme güncellenemedi' },
      { status: 500 }
    );
  }
}

// Bir ödemeyi sil
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Ödeme ID\'si belirtilmemiş' },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Mevcut ödemeyi al
      const existingResult = await client.query(
        'SELECT * FROM odemeler WHERE id = $1',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Ödeme bulunamadı' },
          { status: 404 }
        );
      }

      const existingPayment = existingResult.rows[0];
      
      // İlgili cari hesap kaydını bul ve sil
      if (existingPayment.durum === 'Ödendi') {
        await client.query(
          `DELETE FROM cari_hesap 
           WHERE musteri_id = $1 
           AND tarih = $2 
           AND tutar = $3 
           AND islem_turu = 'Tahsilat'
           AND (siparis_id = $4 OR (siparis_id IS NULL AND $4 IS NULL))`,
          [
            existingPayment.musteri_id,
            existingPayment.odeme_tarihi,
            existingPayment.tutar,
            existingPayment.siparis_id
          ]
        );

        // Kalan cari hesap kayıtlarının bakiyelerini güncelle
        const remainingRecords = await client.query(
          `SELECT id FROM cari_hesap 
           WHERE musteri_id = $1 
           AND (created_at > $2 OR (created_at = $2 AND id > $3))
           ORDER BY created_at ASC, id ASC`,
          [existingPayment.musteri_id, existingPayment.created_at, id]
        );

        let currentBalance = 0;
        // Önceki son bakiyeyi bul
        const previousBalance = await client.query(
          `SELECT bakiye FROM cari_hesap 
           WHERE musteri_id = $1 
           AND (created_at < $2 OR (created_at = $2 AND id < $3))
           ORDER BY created_at DESC, id DESC LIMIT 1`,
          [existingPayment.musteri_id, existingPayment.created_at, id]
        );

        if (previousBalance.rows.length > 0) {
          currentBalance = parseFloat(previousBalance.rows[0].bakiye);
        }

        // Sonraki kayıtların bakiyelerini güncelle
        for (const record of remainingRecords.rows) {
          const recordInfo = await client.query(
            'SELECT islem_turu, tutar FROM cari_hesap WHERE id = $1',
            [record.id]
          );

          if (recordInfo.rows.length > 0) {
            const { islem_turu, tutar } = recordInfo.rows[0];
            if (islem_turu === 'Tahsilat') {
              currentBalance -= parseFloat(tutar);
            } else if (islem_turu === 'Borçlandırma') {
              currentBalance += parseFloat(tutar);
            }

            await client.query(
              'UPDATE cari_hesap SET bakiye = $1 WHERE id = $2',
              [currentBalance, record.id]
            );
          }
        }
      }
      
      // Ödemeyi sil
      await client.query('DELETE FROM odemeler WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Ödeme silinirken hata:', error);
    return NextResponse.json(
      { error: 'Ödeme silinemedi' },
      { status: 500 }
    );
  }
} 