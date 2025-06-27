import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Filament stok ekleme
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      filamentId,
      amount,
      price,
      supplier,
      purchaseDate,
      notes = ''
    } = body;
    
    // Gerekli alanları kontrol et
    if (!filamentId || !amount || !price || !purchaseDate) {
      return NextResponse.json(
        { error: 'Filament ID, miktar, fiyat ve tarih gerekli' },
        { status: 400 }
      );
    }
    
    // Gram başına fiyat hesapla
    const pricePerGram = parseFloat(price) / parseFloat(amount);
    
    // Transaction başlat
    await query('BEGIN');
    
    try {
      // 1. Filament alım kaydını ekle
      const purchaseResult = await query(`
        INSERT INTO filament_purchases (
          filament_id, purchase_date, amount_gram, purchase_price, 
          price_per_gram, supplier, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        filamentId, 
        purchaseDate, 
        parseFloat(amount), 
        parseFloat(price),
        pricePerGram,
        supplier || '',
        notes
      ]);
      
      // 2. Filament stoğunu güncelle
      const updateResult = await query(`
        UPDATE filaments 
        SET 
          remaining_weight = remaining_weight + $1,
          total_weight = total_weight + $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [parseFloat(amount), filamentId]);
      
      if (updateResult.rowCount === 0) {
        throw new Error('Filament bulunamadı');
      }
      
      // Transaction'ı tamamla
      await query('COMMIT');
      
      // Güncellenmiş filament bilgisini döndür
      const updatedFilament = {
        id: updateResult.rows[0].id,
        code: updateResult.rows[0].filament_code,
        name: updateResult.rows[0].name,
        type: updateResult.rows[0].type,
        brand: updateResult.rows[0].brand,
        color: updateResult.rows[0].color,
        location: updateResult.rows[0].location,
        totalWeight: updateResult.rows[0].total_weight,
        remainingWeight: updateResult.rows[0].remaining_weight,
        quantity: updateResult.rows[0].quantity,
        criticalStock: updateResult.rows[0].critical_stock,
        tempRange: updateResult.rows[0].temp_range,
        cap: updateResult.rows[0].cap,
        pricePerGram: updateResult.rows[0].price_per_gram,
        createdAt: updateResult.rows[0].created_at,
        updatedAt: updateResult.rows[0].updated_at
      };
      
      return NextResponse.json({
        success: true,
        message: `${amount}gr stok eklendi`,
        filament: updatedFilament,
        purchase: {
          id: purchaseResult.rows[0].id,
          amount: parseFloat(amount),
          price: parseFloat(price),
          pricePerGram: pricePerGram,
          supplier: supplier || '',
          purchaseDate: purchaseDate
        }
      }, { status: 201 });
      
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Filament stok ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Stok eklenirken bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    );
  }
} 