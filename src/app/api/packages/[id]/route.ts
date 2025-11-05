import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Paket detaylarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const packageId = parseInt(id, 10);

    if (isNaN(packageId)) {
      return NextResponse.json(
        { error: 'Geçersiz paket ID' },
        { status: 400 }
      );
    }

    // Paket bilgilerini getir
    const packageResult = await query(`
      SELECT * FROM product_packages WHERE id = $1
    `, [packageId]);

    if (packageResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Paket bulunamadı' },
        { status: 404 }
      );
    }

    const pkg = packageResult.rows[0];

    // Paket içindeki ürünleri getir
    const itemsResult = await query(`
      SELECT 
        pi.id,
        pi.product_id,
        pi.quantity,
        p.product_code,
        p.product_type,
        p.image_path,
        (SELECT COALESCE(quantity, 0) FROM inventory WHERE product_id = p.id) as available_stock
      FROM package_items pi
      JOIN products p ON p.id = pi.product_id
      WHERE pi.package_id = $1
      ORDER BY pi.id
    `, [packageId]);

    return NextResponse.json({
      ...pkg,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        productId: item.product_id,
        productCode: item.product_code,
        productType: item.product_type,
        productImage: item.image_path,
        quantity: item.quantity,
        availableStock: item.available_stock || 0
      }))
    });
  } catch (error) {
    console.error('Paket detayları getirme hatası:', error);
    return NextResponse.json(
      { error: 'Paket detayları getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Paket güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const packageId = parseInt(id, 10);
    const body = await request.json();
    const { name, description, price, imagePath, items, isActive } = body;

    if (isNaN(packageId)) {
      return NextResponse.json(
        { error: 'Geçersiz paket ID' },
        { status: 400 }
      );
    }

    await query('BEGIN');

    try {
      // Paket bilgilerini güncelle
      await query(`
        UPDATE product_packages
        SET 
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          image_path = COALESCE($4, image_path),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
      `, [name, description, price, imagePath, isActive, packageId]);

      // Eğer items güncelleniyorsa
      if (items && Array.isArray(items)) {
        // Mevcut ürünleri sil
        await query(`
          DELETE FROM package_items WHERE package_id = $1
        `, [packageId]);

        // Yeni ürünleri ekle
        for (const item of items) {
          if (!item.productId || !item.quantity || item.quantity <= 0) {
            throw new Error('Geçersiz ürün bilgisi');
          }

          await query(`
            INSERT INTO package_items (package_id, product_id, quantity)
            VALUES ($1, $2, $3)
          `, [packageId, item.productId, item.quantity]);
        }
      }

      await query('COMMIT');

      return NextResponse.json({ success: true, message: 'Paket güncellendi' });
    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    console.error('Paket güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Paket güncellenirken bir hata oluştu', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

// Paket sil (soft delete - is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const packageId = parseInt(id, 10);

    if (isNaN(packageId)) {
      return NextResponse.json(
        { error: 'Geçersiz paket ID' },
        { status: 400 }
      );
    }

    // Aktif siparişlerde kullanılıyor mu kontrol et
    const orderCheck = await query(`
      SELECT COUNT(*) as count
      FROM order_items
      WHERE package_id = $1 AND status NOT IN ('hazirlandi', 'iptal_edildi')
    `, [packageId]);

    if (parseInt(orderCheck.rows[0]?.count || '0', 10) > 0) {
      return NextResponse.json(
        { error: 'Bu paket aktif siparişlerde kullanılıyor, silinemez' },
        { status: 400 }
      );
    }

    // Soft delete - is_active = false
    await query(`
      UPDATE product_packages
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [packageId]);

    return NextResponse.json({ success: true, message: 'Paket silindi' });
  } catch (error) {
    console.error('Paket silme hatası:', error);
    return NextResponse.json(
      { error: 'Paket silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

