import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Stoktan düşme işlemi
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity, reason, notes, reductionDate } = body;
    
    if (!productId || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Ürün ID, miktar ve sebep gerekli' },
        { status: 400 }
      );
    }
    
    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Miktar 0\'dan büyük olmalı' },
        { status: 400 }
      );
    }
    
    // Transaction başlat
    await query('BEGIN');
    
    try {
      // Mevcut stok durumunu kontrol et
      const inventoryResult = await query(`
        SELECT i.*, p.product_code, p.product_type
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.product_id = $1
      `, [productId]);
      
      if (inventoryResult.rowCount === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: 'Ürün stok tablosunda bulunamadı' },
          { status: 404 }
        );
      }
      
      const currentStock = parseInt(inventoryResult.rows[0].quantity);
      
      if (currentStock < quantity) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: `Yetersiz stok. Mevcut: ${currentStock}, İstenen: ${quantity}` },
          { status: 400 }
        );
      }
      
      // Stoktan düş
      const newQuantity = currentStock - quantity;
      const updateResult = await query(`
        UPDATE inventory
        SET quantity = $1, updated_at = NOW()
        WHERE product_id = $2
        RETURNING *
      `, [newQuantity, productId]);
      
      // Stok düşme logunu kaydet
      await query(`
        INSERT INTO stock_reductions (product_id, quantity, reason, notes, reduction_date, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [productId, quantity, reason, notes || '', reductionDate || new Date().toISOString().split('T')[0]]);
      
      // Transaction'ı tamamla
      await query('COMMIT');
      
      return NextResponse.json({
        message: 'Stoktan düşme işlemi başarılı',
        productId,
        previousQuantity: currentStock,
        newQuantity,
        reducedQuantity: quantity,
        reason,
        notes
      });
      
    } catch (error) {
      // Hata oluşursa transaction'ı geri al
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Stoktan düşme hatası:', error);
    return NextResponse.json(
      { error: 'Stoktan düşme işlemi sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
