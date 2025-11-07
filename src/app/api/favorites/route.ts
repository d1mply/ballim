import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

// Favori ürünleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Müşteri ID gerekli' },
        { status: 400 }
      );
    }

    const result = await query(`
      SELECT 
        fp.id,
        fp.customer_id,
        fp.product_id,
        fp.created_at,
        p.product_code,
        p.product_type,
        p.image_path,
        p.capacity,
        p.dimension_x,
        p.dimension_y,
        p.dimension_z,
        p.print_time,
        p.total_gram,
        p.piece_gram,
        i.quantity as stock_quantity
      FROM favorite_products fp
      INNER JOIN products p ON fp.product_id = p.id
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE fp.customer_id = $1
      ORDER BY fp.created_at DESC
    `, [customerId]);

    const favorites = result.rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      productId: row.product_id,
      createdAt: row.created_at,
      product: {
        id: row.product_id,
        code: row.product_code,
        productType: row.product_type,
        image: row.image_path,
        capacity: row.capacity || 0,
        dimensionX: row.dimension_x || 0,
        dimensionY: row.dimension_y || 0,
        dimensionZ: row.dimension_z || 0,
        printTime: row.print_time || 0,
        totalGram: row.total_gram || 0,
        pieceGram: row.piece_gram || 0,
        stockQuantity: row.stock_quantity || 0
      }
    }));

    return NextResponse.json(favorites);
  } catch (error) {
    console.error('Favori ürünler getirme hatası:', error);
    return NextResponse.json(
      { error: 'Favori ürünler getirilemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

// Favori ürün ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, productId } = body;

    if (!customerId || !productId) {
      return NextResponse.json(
        { error: 'Müşteri ID ve ürün ID gerekli' },
        { status: 400 }
      );
    }

    // Zaten favori mi kontrol et
    const existing = await query(`
      SELECT id FROM favorite_products 
      WHERE customer_id = $1 AND product_id = $2
    `, [customerId, productId]);

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Bu ürün zaten favorilerinizde' },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO favorite_products (customer_id, product_id)
      VALUES ($1, $2)
      RETURNING *
    `, [customerId, productId]);

    return NextResponse.json({
      success: true,
      favorite: result.rows[0]
    });
  } catch (error) {
    console.error('Favori ürün ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Favori ürün eklenemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

// Favori ürün sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');

    if (!customerId || !productId) {
      return NextResponse.json(
        { error: 'Müşteri ID ve ürün ID gerekli' },
        { status: 400 }
      );
    }

    const result = await query(`
      DELETE FROM favorite_products 
      WHERE customer_id = $1 AND product_id = $2
      RETURNING *
    `, [customerId, productId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Favori ürün bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Favori ürün silindi'
    });
  } catch (error) {
    console.error('Favori ürün silme hatası:', error);
    return NextResponse.json(
      { error: 'Favori ürün silinemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

