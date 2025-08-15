import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

// Tüm gram aralığı fiyatlarını getir
export async function GET() {
  try {
    const result = await query(`
      SELECT * FROM wholesale_price_ranges
      WHERE is_active = true
      ORDER BY min_gram ASC
    `);
    
    const priceRanges = result.rows.map(row => ({
      id: row.id,
      minGram: row.min_gram,
      maxGram: row.max_gram,
      price: row.price,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    return NextResponse.json(priceRanges);
  } catch (error) {
    console.error('Gram aralığı fiyatları getirme hatası:', error);
    return NextResponse.json(
      { error: 'Gram aralığı fiyatları getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni gram aralığı fiyatı ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minGram, maxGram, price } = body;
    
    // Validasyon
    if (minGram == null || maxGram == null || price == null) {
      return NextResponse.json(
        { error: 'Min gram, max gram ve fiyat alanları gerekli' },
        { status: 400 }
      );
    }
    
    if (minGram >= maxGram) {
      return NextResponse.json(
        { error: 'Min gram, max gramdan küçük olmalı' },
        { status: 400 }
      );
    }
    
    if (price <= 0) {
      return NextResponse.json(
        { error: 'Fiyat 0\'dan büyük olmalı' },
        { status: 400 }
      );
    }
    
    // Çakışan aralık kontrolü
    const conflictCheck = await query(`
      SELECT id FROM wholesale_price_ranges
      WHERE is_active = true
      AND (
        (min_gram < $2 AND max_gram > $1) OR
        (min_gram < $1 AND max_gram > $1) OR 
        (min_gram < $2 AND max_gram > $2)
      )
    `, [minGram, maxGram]);
    
    if (conflictCheck.rowCount > 0) {
      return NextResponse.json(
        { error: 'Bu gram aralığı mevcut aralıklarla çakışıyor' },
        { status: 400 }
      );
    }
    
    const result = await query(`
      INSERT INTO wholesale_price_ranges (min_gram, max_gram, price)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [minGram, maxGram, price]);
    
    const newRange = {
      id: result.rows[0].id,
      minGram: result.rows[0].min_gram,
      maxGram: result.rows[0].max_gram,
      price: result.rows[0].price,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
    
    return NextResponse.json(newRange, { status: 201 });
  } catch (error) {
    console.error('Gram aralığı fiyatı ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Gram aralığı fiyatı eklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Gram aralığı fiyatı güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, minGram, maxGram, price } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID gerekli' },
        { status: 400 }
      );
    }
    
    // Validasyon
    if (minGram == null || maxGram == null || price == null) {
      return NextResponse.json(
        { error: 'Min gram, max gram ve fiyat alanları gerekli' },
        { status: 400 }
      );
    }
    
    if (minGram >= maxGram) {
      return NextResponse.json(
        { error: 'Min gram, max gramdan küçük olmalı' },
        { status: 400 }
      );
    }
    
    if (price <= 0) {
      return NextResponse.json(
        { error: 'Fiyat 0\'dan büyük olmalı' },
        { status: 400 }
      );
    }
    
    // Çakışan aralık kontrolü (kendisi hariç)
    const conflictCheck = await query(`
      SELECT id FROM wholesale_price_ranges
      WHERE is_active = true AND id != $1
      AND (
        (min_gram < $3 AND max_gram > $2) OR
        (min_gram < $2 AND max_gram > $2) OR 
        (min_gram < $3 AND max_gram > $3)
      )
    `, [id, minGram, maxGram]);
    
    if (conflictCheck.rowCount > 0) {
      return NextResponse.json(
        { error: 'Bu gram aralığı mevcut aralıklarla çakışıyor' },
        { status: 400 }
      );
    }
    
    const result = await query(`
      UPDATE wholesale_price_ranges 
      SET min_gram = $1, max_gram = $2, price = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [minGram, maxGram, price, id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Gram aralığı bulunamadı' },
        { status: 404 }
      );
    }
    
    const updatedRange = {
      id: result.rows[0].id,
      minGram: result.rows[0].min_gram,
      maxGram: result.rows[0].max_gram,
      price: result.rows[0].price,
      isActive: result.rows[0].is_active,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
    
    return NextResponse.json(updatedRange);
  } catch (error) {
    console.error('Gram aralığı fiyatı güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Gram aralığı fiyatı güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Gram aralığı fiyatı sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID gerekli' },
        { status: 400 }
      );
    }
    
    const result = await query(`
      UPDATE wholesale_price_ranges 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Gram aralığı bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Gram aralığı başarıyla silindi' 
    });
  } catch (error) {
    console.error('Gram aralığı fiyatı silme hatası:', error);
    return NextResponse.json(
      { error: 'Gram aralığı fiyatı silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
