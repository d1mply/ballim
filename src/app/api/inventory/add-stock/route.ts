import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Stok ekleme işlemi
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📦 Stok ekleme isteği:', body);
    
    const { productId, quantity, reason, notes } = body;
    
    if (!productId || !quantity) {
      console.error('❌ Eksik parametreler:', { productId, quantity });
      return NextResponse.json(
        { error: 'Ürün ID ve miktar gerekli' },
        { status: 400 }
      );
    }
    
    if (quantity <= 0) {
      console.error('❌ Geçersiz miktar:', quantity);
      return NextResponse.json(
        { error: 'Miktar 0\'dan büyük olmalı' },
        { status: 400 }
      );
    }
    
    // Transaction başlat
    await query('BEGIN');
    
    try {
      console.log('🔄 Stok ekleniyor:', { productId, quantity });
      
      // Stok ekle
      const updateResult = await query(`
        INSERT INTO inventory (product_id, quantity, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (product_id) 
        DO UPDATE SET 
          quantity = inventory.quantity + $2,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [productId, quantity]);
      
      console.log('✅ Stok eklendi:', updateResult.rows[0]);
      
      // Stok ekleme logunu kaydet (sadece stock_reductions tablosu varsa)
      try {
        await query(`
          INSERT INTO stock_reductions (product_id, quantity, reason, notes, reduction_date, created_at)
          VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_TIMESTAMP)
        `, [productId, quantity, reason || 'Manuel Stok Artışı', notes || '']);
        console.log('✅ Stok log kaydedildi');
      } catch (logError) {
        console.warn('⚠️ Stok log kaydedilemedi (tablo yok olabilir):', logError);
        // Log hatası işlemi durdurmaz
      }
      
      // Transaction'ı tamamla
      await query('COMMIT');
      console.log('✅ Transaction tamamlandı');
      
      return NextResponse.json({
        message: 'Stok ekleme işlemi başarılı',
        productId,
        addedQuantity: quantity,
        reason,
        notes
      });
      
    } catch (error) {
      // Hata oluşursa transaction'ı geri al
      await query('ROLLBACK');
      console.error('❌ Transaction hatası:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Stok ekleme hatası:', error);
    
    // Detaylı hata mesajı
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('❌ Hata detayı:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Stok ekleme işlemi sırasında bir hata oluştu',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
