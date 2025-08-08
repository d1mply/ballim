import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

// Ürünü kopyala (resim hariç)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId } = body as { sourceId?: string | number };

    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId gerekli' },
        { status: 400 }
      );
    }

    // Transaction başlat
    await query('BEGIN');

    // Kaynak ürünü getir
    const sourceProductResult = await query(
      `SELECT * FROM products WHERE id = $1`,
      [sourceId]
    );

    if (sourceProductResult.rows.length === 0) {
      await query('ROLLBACK');
      return NextResponse.json(
        { error: 'Kaynak ürün bulunamadı' },
        { status: 404 }
      );
    }

    const source = sourceProductResult.rows[0];

    // Yeni ürün kodunu oluştur: ORJ-Kopya, doluysa ORJ-Kopya-2, -3...
    const baseCode = `${source.product_code}-Kopya`;
    let candidateCode = baseCode;
    let suffix = 1; // 1: sadece -Kopya, >1 ise -Kopya-2...

    // Benzersiz kod bul
    // Önce baseCode'u dene, varsa -Kopya-2, -3 ...
    // Güvenlik için üst sınır
    const maxAttempts = 200;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await query(
        `SELECT id FROM products WHERE product_code = $1`,
        [candidateCode]
      );
      if (exists.rows.length === 0) break;
      suffix += 1;
      candidateCode = `${baseCode}-${suffix}`;
      if (suffix > maxAttempts) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: 'Benzersiz kopya ürün kodu oluşturulamadı' },
          { status: 500 }
        );
      }
    }

    // Yeni ürünü ekle (image_path hariç; null bırak)
    const insertProductResult = await query(
      `INSERT INTO products (
        product_code, product_type, image_path, capacity,
        dimension_x, dimension_y, dimension_z, print_time,
        total_gram, piece_gram, file_path, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        candidateCode,
        source.product_type,
        null, // image_path kopyalanmaz
        source.capacity || 0,
        source.dimension_x || 0,
        source.dimension_y || 0,
        source.dimension_z || 0,
        source.print_time || 0,
        source.total_gram || 0,
        source.piece_gram || 0,
        source.file_path || '',
        source.notes || ''
      ]
    );

    const newProductId = insertProductResult.rows[0].id;

    // Filamentleri kopyala
    const sourceFilaments = await query(
      `SELECT filament_type, filament_color, filament_density, weight
       FROM product_filaments
       WHERE product_id = $1`,
      [sourceId]
    );

    for (const row of sourceFilaments.rows) {
      await query(
        `INSERT INTO product_filaments (
          product_id, filament_type, filament_color, filament_density, weight
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          newProductId,
          row.filament_type,
          row.filament_color || '',
          row.filament_density || '',
          row.weight || 0,
        ]
      );
    }

    // Stok satırı oluştur (0 adet)
    await query(
      `INSERT INTO inventory (product_id, quantity) VALUES ($1, 0)`,
      [newProductId]
    );

    // Transaction commit
    await query('COMMIT');

    // Yeni ürünü tüm detaylarıyla getir
    const completeProductResult = await query(
      `SELECT p.*,
        (SELECT json_agg(json_build_object(
          'id', pf.id,
          'type', pf.filament_type,
          'color', pf.filament_color,
          'brand', pf.filament_density,
          'weight', pf.weight
        ))
        FROM product_filaments pf
        WHERE pf.product_id = p.id) as filaments,
        COALESCE(i.quantity, 0) as stock_quantity
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.id = $1`,
      [newProductId]
    );

    const product = completeProductResult.rows[0];

    // Frontend formatına dönüştür
    const responseProduct = {
      id: product.id,
      code: product.product_code,
      productType: product.product_type,
      image: product.image_path,
      capacity: product.capacity || 0,
      dimensionX: product.dimension_x || 0,
      dimensionY: product.dimension_y || 0,
      dimensionZ: product.dimension_z || 0,
      printTime: product.print_time || 0,
      totalGram: product.total_gram || 0,
      pieceGram: product.piece_gram || 0,
      filePath: product.file_path || '',
      notes: product.notes || '',
      stockQuantity: parseInt(product.stock_quantity) || 0,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      filaments: Array.isArray(product.filaments) ? product.filaments : [],
    };

    return NextResponse.json(responseProduct, { status: 201 });
  } catch (error) {
    try { await query('ROLLBACK'); } catch {}
    console.error('Ürün kopyalama hatası:', error);
    return NextResponse.json(
      { error: 'Ürün kopyalanırken bir hata oluştu' },
      { status: 500 }
    );
  }
}


