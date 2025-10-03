import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

// Belirli bir ürünü getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    // Ürün ve filament detaylarını getir - rezerve stok sistemi ile
    const result = await query(`
      SELECT p.*, 
        (SELECT json_agg(json_build_object(
          'id', pf.id,
          'type', pf.filament_type,
          'color', pf.filament_color,
          'brand', pf.filament_density,
          'weight', pf.weight
        ))
        FROM product_filaments pf
        WHERE pf.product_id = p.id) as filaments,
        COALESCE(i.quantity, 0) as available_stock,
        COALESCE((
          SELECT SUM(oi.quantity) 
          FROM order_items oi 
          WHERE oi.product_id = p.id 
          AND oi.status IN ('onay_bekliyor', 'uretiliyor', 'uretildi', 'hazirlaniyor')
        ), 0) as reserved_stock
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.id = $1 OR p.product_code = $1
    `, [productId]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    const product = result.rows[0];
    
    // Rezerve stok sistemi ile formatla
    const availableStock = parseInt(product.available_stock) || 0;
    const reservedStock = parseInt(product.reserved_stock) || 0;
    const totalStock = availableStock + reservedStock;
    
    // Snake case alanları camelCase'e dönüştür
    const formattedProduct = {
      id: product.id,
      code: product.product_code,
      productType: product.product_type,
      image: product.image_path,
      barcode: product.barcode || '',
      capacity: product.capacity || 0,
      dimensionX: product.dimension_x || 0,
      dimensionY: product.dimension_y || 0,
      dimensionZ: product.dimension_z || 0,
      printTime: product.print_time || 0,
      totalGram: product.total_gram || 0,
      pieceGram: product.piece_gram || 0,
      filePath: product.file_path,
      notes: product.notes || '',
      stockQuantity: availableStock, // Geriye uyumluluk için
      availableStock: availableStock,
      reservedStock: reservedStock,
      totalStock: totalStock,
      stockDisplay: availableStock > 0 
        ? `Stok ${availableStock} (${reservedStock} rezerve)`
        : reservedStock > 0 
          ? `Stok 0 (${reservedStock} rezerve)`
          : 'Stokta Yok',
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      filaments: Array.isArray(product.filaments) ? product.filaments : []
    };
    
    return NextResponse.json(formattedProduct);
  } catch (error) {
    console.error('Ürün getirme hatası:', error);
    return NextResponse.json(
      { error: 'Ürün getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
