import { NextRequest, NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

// Tüm cari hesap işlemlerini getir
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const customerId = searchParams.get('customer_id');
    
    // 🔒 GÜVENLİK: Auth kontrolü - Cookie'den kullanıcı bilgisini al
    const authCookie = request.cookies.get('auth-token');
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Oturum süresi dolmuş. Lütfen yeniden giriş yapın.' },
        { status: 401 }
      );
    }
    
    let currentUser;
    try {
      currentUser = JSON.parse(authCookie.value);
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz oturum. Lütfen yeniden giriş yapın.' },
        { status: 401 }
      );
    }
    
    // 🔒 GÜVENLİK: Müşteriler sadece kendi cari hesaplarını görebilir
    if (currentUser.type === 'customer') {
      if (!customerId || customerId !== currentUser.id.toString()) {
        return NextResponse.json(
          { error: 'Bu bilgilere erişim yetkiniz yok.' },
          { status: 403 }
        );
      }
    }
    
    // Eğer müşteri ID'si belirtilmişse, sadece o müşterinin cari hesap işlemlerini getir
    let query = `
      SELECT 
        ch.id, 
        ch.musteri_id, 
        c.name as musteri_adi,
        ch.tarih, 
        ch.aciklama, 
        ch.islem_turu, 
        ch.tutar, 
        ch.odeme_yontemi,
        ch.siparis_id,
        ch.bakiye,
        ch.created_at
      FROM cari_hesap ch
      JOIN customers c ON ch.musteri_id = c.id
    `;
    
    const params = [];
    
    if (customerId) {
      query += ` WHERE ch.musteri_id = $1`;
      params.push(customerId);
    }
    
    query += ` ORDER BY ch.created_at DESC, ch.id DESC`;
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(query, params);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Cari hesap verileri getirilemedi' },
      { status: 500 }
    );
  }
}

// Yeni cari hesap işlemi ekle
export async function POST(request: NextRequest) {
  try {
    // 🔒 GÜVENLİK: Auth kontrolü
    const authCookie = request.cookies.get('auth-token');
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Oturum süresi dolmuş. Lütfen yeniden giriş yapın.' },
        { status: 401 }
      );
    }
    
    let currentUser;
    try {
      currentUser = JSON.parse(authCookie.value);
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz oturum. Lütfen yeniden giriş yapın.' },
        { status: 401 }
      );
    }
    
    // 🔒 GÜVENLİK: Sadece admin cari hesap işlemi ekleyebilir
    if (currentUser.type !== 'admin') {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok.' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    const { 
      musteri_id, 
      tarih, 
      aciklama, 
      islem_turu, 
      tutar, 
      odeme_yontemi,
      siparis_id 
    } = data;
    
    if (!musteri_id || !tarih || !islem_turu || tutar === undefined) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik' },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
            // Müşterinin son bakiyesini al
      const bakiyeResult = await client.query(
        `SELECT bakiye FROM cari_hesap 
         WHERE musteri_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [musteri_id]
      );
      
      let oncekiBakiye = 0;
      if (bakiyeResult.rows.length > 0) {
        oncekiBakiye = parseFloat(bakiyeResult.rows[0].bakiye);
      }
      
      // Yeni bakiyeyi hesapla (Tahsilat: -, Borçlandırma: +)
      let yeniBakiye = oncekiBakiye;
      if (islem_turu === 'Tahsilat') {
        yeniBakiye -= parseFloat(tutar);
      } else if (islem_turu === 'Borçlandırma') {
        yeniBakiye += parseFloat(tutar);
      }
      
      // Yeni işlemi ekle
      const result = await client.query(
        `INSERT INTO cari_hesap (
          musteri_id, tarih, aciklama, islem_turu, tutar, 
          odeme_yontemi, siparis_id, bakiye, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [
          musteri_id, 
          tarih, 
          aciklama, 
          islem_turu, 
          tutar, 
          odeme_yontemi || null,
          siparis_id || null,
          yeniBakiye
        ]
      );
      
      await client.query('COMMIT');
      
      return NextResponse.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Cari hesap işlemi eklenemedi' },
      { status: 500 }
    );
  }
}

// Bir cari hesap işlemini güncelle
export async function PUT(request: NextRequest) {
  try {
    // 🔒 GÜVENLİK: Auth kontrolü
    const authCookie = request.cookies.get('auth-token');
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Oturum süresi dolmuş. Lütfen yeniden giriş yapın.' },
        { status: 401 }
      );
    }
    
    let currentUser;
    try {
      currentUser = JSON.parse(authCookie.value);
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz oturum. Lütfen yeniden giriş yapın.' },
        { status: 401 }
      );
    }
    
    // 🔒 GÜVENLİK: Sadece admin cari hesap işlemini güncelleyebilir
    if (currentUser.type !== 'admin') {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok.' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    const { 
      id,
      tarih, 
      aciklama, 
      islem_turu, 
      tutar, 
      odeme_yontemi 
    } = data;
    
    if (!id || !tarih || !islem_turu || tutar === undefined) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik' },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Mevcut işlemi al
      const existingResult = await client.query(
        'SELECT * FROM cari_hesap WHERE id = $1',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'İşlem bulunamadı' },
          { status: 404 }
        );
      }
      
      const existingRecord = existingResult.rows[0];
      const musteri_id = existingRecord.musteri_id;
      
      // İşlem sonrasındaki tüm kayıtları al
      const laterRecords = await client.query(
        `SELECT * FROM cari_hesap 
         WHERE musteri_id = $1 AND (created_at > $2 OR (created_at = $2 AND id > $3))
         ORDER BY created_at ASC, id ASC`,
        [musteri_id, existingRecord.created_at, id]
      );
      
      // İşlemden önceki son bakiyeyi al
      const previousResult = await client.query(
        `SELECT bakiye FROM cari_hesap 
         WHERE musteri_id = $1 AND (created_at < $2 OR (created_at = $2 AND id < $3))
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [musteri_id, existingRecord.created_at, id]
      );
      
      let oncekiBakiye = 0;
      if (previousResult.rows.length > 0) {
        oncekiBakiye = parseFloat(previousResult.rows[0].bakiye);
      }
      
      // Mevcut işlemin bakiyeye etkisini hesapla
      if (existingRecord.islem_turu === 'Tahsilat') {
        oncekiBakiye += parseFloat(existingRecord.tutar); // Eski tahsilatı geri ekle
      } else {
        oncekiBakiye -= parseFloat(existingRecord.tutar); // Eski borçlandırmayı çıkar
      }
      
      // Yeni işlemin bakiye etkisini hesapla
      let yeniBakiye = oncekiBakiye;
      if (islem_turu === 'Tahsilat') {
        yeniBakiye -= parseFloat(tutar);
      } else if (islem_turu === 'Borçlandırma') {
        yeniBakiye += parseFloat(tutar);
      }
      
      // İşlemi güncelle
      await client.query(
        `UPDATE cari_hesap SET
          tarih = $1, aciklama = $2, islem_turu = $3, tutar = $4, 
          odeme_yontemi = $5, bakiye = $6
         WHERE id = $7`,
        [tarih, aciklama, islem_turu, tutar, odeme_yontemi || null, yeniBakiye, id]
      );
      
      // Sonraki işlemlerin bakiyelerini güncelle
      let guncelBakiye = yeniBakiye;
      for (const record of laterRecords.rows) {
        if (record.islem_turu === 'Tahsilat') {
          guncelBakiye -= parseFloat(record.tutar);
        } else if (record.islem_turu === 'Borçlandırma') {
          guncelBakiye += parseFloat(record.tutar);
        }
        
        await client.query(
          'UPDATE cari_hesap SET bakiye = $1 WHERE id = $2',
          [guncelBakiye, record.id]
        );
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Cari hesap işlemi güncellenemedi' },
      { status: 500 }
    );
  }
}

// Bir cari hesap işlemini sil
export async function DELETE(request: NextRequest) {
  try {
    // 🔒 GÜVENLİK: Auth kontrolü
    const authCookie = request.cookies.get('auth-token');
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Oturum süresi dolmuş. Lütfen yeniden giriş yapın.' },
        { status: 401 }
      );
    }
    
    let currentUser;
    try {
      currentUser = JSON.parse(authCookie.value);
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz oturum. Lütfen yeniden giriş yapın.' },
        { status: 401 }
      );
    }
    
    // 🔒 GÜVENLİK: Sadece admin cari hesap işlemini silebilir
    if (currentUser.type !== 'admin') {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok.' },
        { status: 403 }
      );
    }
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'İşlem ID\'si belirtilmemiş' },
        { status: 400 }
      );
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Silinecek işlemi al
      const existingResult = await client.query(
        'SELECT * FROM cari_hesap WHERE id = $1',
        [id]
      );
      
      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'İşlem bulunamadı' },
          { status: 404 }
        );
      }
      
      const existingRecord = existingResult.rows[0];
      const musteri_id = existingRecord.musteri_id;
      
      // İşlem sonrasındaki tüm kayıtları al
      const laterRecords = await client.query(
        `SELECT * FROM cari_hesap 
         WHERE musteri_id = $1 AND (created_at > $2 OR (created_at = $2 AND id > $3))
         ORDER BY created_at ASC, id ASC`,
        [musteri_id, existingRecord.created_at, id]
      );
      
      // İşlemden önceki son bakiyeyi al
      const previousResult = await client.query(
        `SELECT bakiye FROM cari_hesap 
         WHERE musteri_id = $1 AND (created_at < $2 OR (created_at = $2 AND id < $3))
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [musteri_id, existingRecord.created_at, id]
      );
      
      let oncekiBakiye = 0;
      if (previousResult.rows.length > 0) {
        oncekiBakiye = parseFloat(previousResult.rows[0].bakiye);
      }
      
      // İşlemi sil
      await client.query('DELETE FROM cari_hesap WHERE id = $1', [id]);
      
      // Sonraki işlemlerin bakiyelerini güncelle
      let guncelBakiye = oncekiBakiye;
      for (const record of laterRecords.rows) {
        if (record.islem_turu === 'Tahsilat') {
          guncelBakiye -= parseFloat(record.tutar);
        } else if (record.islem_turu === 'Borçlandırma') {
          guncelBakiye += parseFloat(record.tutar);
        }
        
        await client.query(
          'UPDATE cari_hesap SET bakiye = $1 WHERE id = $2',
          [guncelBakiye, record.id]
        );
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Cari hesap işlemi silinirken hata:', error);
    return NextResponse.json(
      { error: 'Cari hesap işlemi silinemedi' },
      { status: 500 }
    );
  }
} 