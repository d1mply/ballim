import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Stok durumunu getir
export async function GET(request: NextRequest) {
  try {
    const result = await query(`
      SELECT i.*, 
        p.product_code, 
        p.product_type,
        p.capacity,
        (p.capacity - i.quantity) as required_quantity,
        CASE 
          WHEN i.quantity >= p.capacity THEN 'Stokta Var'
          WHEN i.quantity > 0 THEN 'Kısmi Stok'
          ELSE 'Stokta Yok'
        END as stock_status
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      ORDER BY p.product_code
    `);
    
    // Snake case alanları camelCase'e dönüştür
    const inventory = result.rows.map(item => {
      const { 
        product_id, product_code, product_type, 
        required_quantity, stock_status, 
        updated_at, ...rest 
      } = item;
      
      return {
        ...rest,
        productId: product_id,
        productCode: product_code,
        productType: product_type,
        requiredQuantity: parseInt(required_quantity) || 0,
        stockStatus: stock_status,
        updatedAt: updated_at
      };
    });
    
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Stok durumunu getirme hatası:', error);
    return NextResponse.json(
      { error: 'Stok durumu getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Stok miktarını güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity, operation } = body;
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Ürün ID gerekli' },
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
        // Ürün stok tablosunda yoksa yeni kayıt oluştur
        const newResult = await query(`
          INSERT INTO inventory (product_id, quantity)
          VALUES ($1, $2)
          RETURNING *
        `, [productId, quantity]);
        
        await query('COMMIT');
        
        // Ürün bilgileriyle zenginleştir
        const productResult = await query(`
          SELECT p.product_code, p.product_type
          FROM products p
          WHERE p.id = $1
        `, [productId]);
        
        const { quantity, updated_at } = newResult.rows[0];
        const { product_code, product_type } = productResult.rows[0];
        
        return NextResponse.json({
          productId,
          productCode: product_code,
          productType: product_type,
          quantity: parseInt(quantity),
          stockStatus: quantity > 0 ? 'Stokta Var' : 'Stokta Yok',
          updatedAt: updated_at
        });
      } else {
        // Mevcut stok kaydını güncelle
        const currentInventory = inventoryResult.rows[0];
        let newQuantity = parseInt(currentInventory.quantity);
        
        if (operation === 'add') {
          newQuantity += parseInt(quantity);
        } else if (operation === 'subtract') {
          newQuantity -= parseInt(quantity);
          if (newQuantity < 0) newQuantity = 0; // Negatif stok engelle
        } else {
          // Operation belirtilmemişse direkt olarak atama yap
          newQuantity = parseInt(quantity);
        }
        
        const updateResult = await query(`
          UPDATE inventory
          SET quantity = $1, updated_at = NOW()
          WHERE product_id = $2
          RETURNING *
        `, [newQuantity, productId]);
        
        await query('COMMIT');
        
        // Ürün bilgileriyle zenginleştir
        const { product_code, product_type } = currentInventory;
        const { quantity: updatedQuantity, updated_at } = updateResult.rows[0];
        
        return NextResponse.json({
          productId,
          productCode: product_code,
          productType: product_type,
          quantity: parseInt(updatedQuantity),
          stockStatus: updatedQuantity > 0 ? 'Stokta Var' : 'Stokta Yok',
          updatedAt: updated_at
        });
      }
    } catch (error) {
      // Hata oluşursa transaction'ı geri al
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Stok güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Stok güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Toplu stok güncelleme
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Geçerli stok ürünleri gerekli' },
        { status: 400 }
      );
    }
    
    // Transaction başlat
    await query('BEGIN');
    
    try {
      const updatedItems = [];
      
      for (const item of items) {
        const { productId, quantity } = item;
        
        if (!productId || quantity === undefined) {
          continue;
        }
        
        // Ürünün stok kaydı var mı kontrol et
        const checkResult = await query(`
          SELECT COUNT(*) FROM inventory WHERE product_id = $1
        `, [productId]);
        
        const exists = parseInt(checkResult.rows[0].count) > 0;
        
        if (exists) {
          // Güncelle
          const updateResult = await query(`
            UPDATE inventory
            SET quantity = $1, updated_at = NOW()
            WHERE product_id = $2
            RETURNING *
          `, [quantity, productId]);
          
          updatedItems.push({
            productId,
            quantity: parseInt(updateResult.rows[0].quantity),
            updated: true
          });
        } else {
          // Yeni kayıt oluştur
          const insertResult = await query(`
            INSERT INTO inventory (product_id, quantity)
            VALUES ($1, $2)
            RETURNING *
          `, [productId, quantity]);
          
          updatedItems.push({
            productId,
            quantity: parseInt(insertResult.rows[0].quantity),
            created: true
          });
        }
      }
      
      // Transaction'ı tamamla
      await query('COMMIT');
      
      return NextResponse.json({
        message: `${updatedItems.length} ürün için stok güncellendi`,
        items: updatedItems
      });
    } catch (error) {
      // Hata oluşursa transaction'ı geri al
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Toplu stok güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Stoklar güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 