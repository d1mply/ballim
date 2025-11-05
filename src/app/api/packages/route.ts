import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Tüm paketleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeItems = searchParams.get('includeItems') === 'true';

    let packagesQuery = `
      SELECT 
        p.id,
        p.package_code,
        p.name,
        p.description,
        p.price,
        p.image_path,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM product_packages p
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
    `;

    const result = await query(packagesQuery);
    const packages = result.rows;

    // Eğer içindeki ürünler de isteniyorsa
    if (includeItems) {
      for (const pkg of packages) {
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
        `, [pkg.id]);

        pkg.items = itemsResult.rows.map(item => ({
          id: item.id,
          productId: item.product_id,
          productCode: item.product_code,
          productType: item.product_type,
          productImage: item.image_path,
          quantity: item.quantity,
          availableStock: item.available_stock || 0
        }));
      }
    }

    return NextResponse.json(packages);
  } catch (error) {
    console.error('Paketleri getirme hatası:', error);
    return NextResponse.json(
      { error: 'Paketler getirilirken bir hata oluştu', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

// Yeni paket oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, imagePath, items } = body;

    if (!name || !price || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Paket adı, fiyat ve en az bir ürün gerekli' },
        { status: 400 }
      );
    }

    // Paket kodu oluştur
    const codeResult = await query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(package_code FROM 5) AS INTEGER)), 0) + 1 as next_num
      FROM product_packages
      WHERE package_code LIKE 'PAK-%'
    `);
    const nextNum = codeResult.rows[0]?.next_num || 1;
    const packageCode = `PAK-${String(nextNum).padStart(3, '0')}`;

    // Transaction başlat
    await query('BEGIN');

    try {
      // Paketi oluştur
      const packageResult = await query(`
        INSERT INTO product_packages (package_code, name, description, price, image_path, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
      `, [packageCode, name, description || null, price, imagePath || null]);

      const newPackage = packageResult.rows[0];

      // Paket içindeki ürünleri ekle
      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          throw new Error('Geçersiz ürün bilgisi');
        }

        await query(`
          INSERT INTO package_items (package_id, product_id, quantity)
          VALUES ($1, $2, $3)
        `, [newPackage.id, item.productId, item.quantity]);
      }

      await query('COMMIT');

      // Paket bilgilerini ve içindeki ürünleri döndür
      const itemsResult = await query(`
        SELECT 
          pi.id,
          pi.product_id,
          pi.quantity,
          p.product_code,
          p.product_type,
          (SELECT COALESCE(quantity, 0) FROM inventory WHERE product_id = p.id) as available_stock
        FROM package_items pi
        JOIN products p ON p.id = pi.product_id
        WHERE pi.package_id = $1
      `, [newPackage.id]);

      return NextResponse.json({
        success: true,
        package: {
          ...newPackage,
          items: itemsResult.rows.map(item => ({
            id: item.id,
            productId: item.product_id,
            productCode: item.product_code,
            productType: item.product_type,
            quantity: item.quantity,
            availableStock: item.available_stock || 0
          }))
        }
      });
    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    console.error('Paket oluşturma hatası:', error);
    return NextResponse.json(
      { error: 'Paket oluşturulurken bir hata oluştu', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

