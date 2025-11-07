import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { createAuditLog, getUserFromRequest } from '../../../../lib/audit-log';

// Belirli bir ürünü getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = id;

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

// Ürünü sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string;
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    const productId = parseInt(id) || id;
    console.log('Ürün silme işlemi başlatıldı:', { productId, originalId: id });

    // Önce ürünün aktif siparişlerde kullanılıp kullanılmadığını kontrol et
    // Yalnızca üretim/teslim öncesi durumları engelleriz
    const orderCheck = await query(`
      SELECT COUNT(*) AS order_count
      FROM order_items oi
      WHERE (oi.product_id = $1::integer OR oi.product_id = (
               SELECT id FROM products WHERE product_code = $2
             ))
        AND oi.status IN ('onay_bekliyor','uretiliyor','uretildi','hazirlaniyor')
    `, [productId, id]);

    console.log('Sipariş kontrolü sonucu:', orderCheck.rows[0]);

    const activeOrderCount = parseInt(orderCheck.rows[0].order_count);
    if (activeOrderCount > 0) {
      console.log('Ürün aktif siparişlerde kullanılıyor, silme engellendi');
      return NextResponse.json(
        { error: `Bu ürün aktif siparişlerde (${activeOrderCount}) kullanıldığı için silinemez. Lütfen ilgili siparişleri tamamlayın veya iptal edin.` },
        { status: 400 }
      );
    }

    // Ürünü sil (CASCADE ile product_filaments ve inventory otomatik silinir)
    console.log('Ürün siliniyor...');
    const result = await query(`
      DELETE FROM products 
      WHERE id = $1::integer OR product_code = $2
      RETURNING id
    `, [productId, id]);

    console.log('Silme sonucu:', { rowCount: result.rowCount });

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    // Audit log
    const userInfo = await getUserFromRequest(request);
    const deletedProduct = result.rows[0];
    await createAuditLog({
      ...userInfo,
      action: 'DELETE',
      entityType: 'PRODUCT',
      entityId: String(productId),
      entityName: deletedProduct?.product_code || 'Bilinmeyen',
      details: { productId, reason: 'User deletion' }
    });

    console.log('Ürün başarıyla silindi');
    return NextResponse.json(
      { message: 'Ürün başarıyla silindi' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Ürün silme hatası:', error);
    console.error('Hata detayları:', {
      message: error?.message || 'Bilinmeyen hata',
      stack: error?.stack,
      productId: id || 'Bilinmiyor'
    });
    return NextResponse.json(
      { error: 'Ürün silinirken bir hata oluştu', details: error?.message || 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}