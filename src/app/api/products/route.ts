import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { getStockStatus } from '../../../lib/stock';
import { createAuditLog, getUserFromRequest } from '../../../lib/audit-log';

// Tüm ürünleri getir
export async function GET() {
  try {
    // Ürünleri ve filament detaylarını getir
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
        WHERE pf.product_id = p.id) as filaments
      FROM products p
      ORDER BY p.product_code
    `);
    
    // Her ürün için stok durumunu al ve yapıyı frontend ile uyumlu hale getir
    const products = await Promise.all(result.rows.map(async (product) => {
      const { 
        id,
        product_code, 
        product_type, 
        image_path, 
        barcode,
        capacity,
        dimension_x, 
        dimension_y, 
        dimension_z, 
        print_time, 
        total_gram, 
        piece_gram, 
        file_path, 
        notes,
        created_at, 
        updated_at, 
        filaments
      } = product;
      
      // Yeni stok sistemi ile stok durumunu al
      const stockStatus = await getStockStatus(id);
      
      return {
        id,
        code: product_code,
        productType: product_type,
        image: image_path,
        barcode: barcode || '',
        capacity: capacity || 0,
        dimensionX: dimension_x || 0,
        dimensionY: dimension_y || 0,
        dimensionZ: dimension_z || 0,
        printTime: print_time || 0,
        totalGram: total_gram || 0,
        pieceGram: piece_gram || 0,
        filePath: file_path,
        notes: notes || '',
        stockQuantity: stockStatus.availableStock, // Geriye uyumluluk için
        availableStock: stockStatus.availableStock,
        reservedStock: stockStatus.reservedStock,
        totalStock: stockStatus.totalStock,
        stockDisplay: stockStatus.stockDisplay,
        stockColor: stockStatus.stockColor, // Yeni stok rengi eklendi
        createdAt: created_at,
        updatedAt: updated_at,
        filaments: Array.isArray(filaments) ? filaments : []
      };
    }));
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('Ürünleri getirme hatası:', error);
    return NextResponse.json(
      { 
        error: 'Ürünler getirilirken bir hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Yeni ürün oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productCode,
      productType,
      imagePath,
      barcode,
      capacity,
      dimensionX,
      dimensionY,
      dimensionZ,
      printTime,
      totalGram,
      pieceGram,
      filePath,
      notes,
      unitPrice,
      filaments
    } = body;

    // Gerekli alanları kontrol et
    if (!productCode || !productType) {
      return NextResponse.json(
        { error: 'Ürün kodu ve tipi gerekli' },
        { status: 400 }
      );
    }

    // Ürün kodunun benzersizliğini kontrol et
    const existingProduct = await query(
      'SELECT id FROM products WHERE product_code = $1',
      [productCode]
    );

    if (existingProduct.rows.length > 0) {
      return NextResponse.json(
        { error: 'Bu ürün kodu zaten kullanılıyor' },
        { status: 400 }
      );
    }

    // Transaction başlat
    await query('BEGIN');

    try {
      // Ürünü oluştur
      const productResult = await query(`
        INSERT INTO products (
          product_code, product_type, image_path, barcode, capacity,
          dimension_x, dimension_y, dimension_z, print_time, total_gram,
          piece_gram, file_path, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        productCode, productType, imagePath || null, barcode || null, capacity || 0,
        dimensionX || 0, dimensionY || 0, dimensionZ || 0, printTime || 0, totalGram || 0,
        pieceGram || 0, filePath || null, notes || null
      ]);

      const newProduct = productResult.rows[0];

      // Filamentleri ekle
      if (filaments && Array.isArray(filaments) && filaments.length > 0) {
        for (const filament of filaments) {
          await query(`
            INSERT INTO product_filaments (
              product_id, filament_type, filament_color, filament_density, weight
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            newProduct.id,
            filament.type,
            filament.color,
            filament.brand || '',
            filament.weight || 0
          ]);
        }
      }

      // Stok tablosuna başlangıç kaydı ekle
      await query(`
        INSERT INTO inventory (product_id, quantity, updated_at)
        VALUES ($1, 0, CURRENT_TIMESTAMP)
      `, [newProduct.id]);

      await query('COMMIT');

      // Audit log
      const userInfo = await getUserFromRequest(request);
      await createAuditLog({
        ...userInfo,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: String(newProduct.id),
        entityName: `${productCode} - ${productType}`,
        details: { productCode, productType, capacity, filaments: filaments?.length || 0 }
      });

      return NextResponse.json({
        success: true,
        message: 'Ürün başarıyla oluşturuldu',
        product: newProduct
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Ürün oluşturma hatası:', error);
    console.error('Hata detayları:', {
      message: error instanceof Error ? error.message : 'Bilinmeyen hata',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Ürün oluşturulurken bir hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
}

// Ürün güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      productCode,
      productType,
      imagePath,
      barcode,
      capacity,
      dimensionX,
      dimensionY,
      dimensionZ,
      printTime,
      totalGram,
      pieceGram,
      filePath,
      notes,
      filaments
    } = body;

    // ID kontrolü
    if (!id) {
      return NextResponse.json(
        { error: 'Ürün ID gerekli' },
        { status: 400 }
      );
    }

    // Ürünün var olup olmadığını kontrol et
    const existingProduct = await query(
      'SELECT id FROM products WHERE id = $1',
      [id]
    );

    if (existingProduct.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    // Ürün kodunun benzersizliğini kontrol et (kendi ID'si hariç)
    if (productCode) {
      const codeCheck = await query(
        'SELECT id FROM products WHERE product_code = $1 AND id != $2',
        [productCode, id]
      );

      if (codeCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Bu ürün kodu başka bir ürün tarafından kullanılıyor' },
          { status: 400 }
        );
      }
    }

    // Transaction başlat
    await query('BEGIN');

    try {
      // Ürünü güncelle
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (productCode) {
        updateFields.push(`product_code = $${paramIndex++}`);
        updateValues.push(productCode);
      }
      if (productType) {
        updateFields.push(`product_type = $${paramIndex++}`);
        updateValues.push(productType);
      }
      if (imagePath !== undefined) {
        updateFields.push(`image_path = $${paramIndex++}`);
        updateValues.push(imagePath || null);
      }
      if (barcode !== undefined) {
        updateFields.push(`barcode = $${paramIndex++}`);
        updateValues.push(barcode || null);
      }
      if (capacity !== undefined) {
        updateFields.push(`capacity = $${paramIndex++}`);
        updateValues.push(capacity || 0);
      }
      if (dimensionX !== undefined) {
        updateFields.push(`dimension_x = $${paramIndex++}`);
        updateValues.push(dimensionX || 0);
      }
      if (dimensionY !== undefined) {
        updateFields.push(`dimension_y = $${paramIndex++}`);
        updateValues.push(dimensionY || 0);
      }
      if (dimensionZ !== undefined) {
        updateFields.push(`dimension_z = $${paramIndex++}`);
        updateValues.push(dimensionZ || 0);
      }
      if (printTime !== undefined) {
        updateFields.push(`print_time = $${paramIndex++}`);
        updateValues.push(printTime || 0);
      }
      if (totalGram !== undefined) {
        updateFields.push(`total_gram = $${paramIndex++}`);
        updateValues.push(totalGram || 0);
      }
      if (pieceGram !== undefined) {
        updateFields.push(`piece_gram = $${paramIndex++}`);
        updateValues.push(pieceGram || 0);
      }
      if (filePath !== undefined) {
        updateFields.push(`file_path = $${paramIndex++}`);
        updateValues.push(filePath || null);
      }
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateValues.push(notes || null);
      }

      // updated_at her zaman güncellenir
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (updateFields.length === 0) {
        await query('ROLLBACK');
        return NextResponse.json(
          { error: 'Güncellenecek alan bulunamadı' },
          { status: 400 }
        );
      }

      updateValues.push(id);
      const updateQuery = `
        UPDATE products 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const productResult = await query(updateQuery, updateValues);
      const updatedProduct = productResult.rows[0];

      // Filamentleri güncelle (önce sil, sonra ekle)
      if (filaments !== undefined) {
        // Mevcut filamentleri sil
        await query(
          'DELETE FROM product_filaments WHERE product_id = $1',
          [id]
        );

        // Yeni filamentleri ekle
        if (Array.isArray(filaments) && filaments.length > 0) {
          for (const filament of filaments) {
            await query(`
              INSERT INTO product_filaments (
                product_id, filament_type, filament_color, filament_density, weight
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              id,
              filament.type,
              filament.color,
              filament.brand || '',
              filament.weight || 0
            ]);
          }
        }
      }

      await query('COMMIT');

      // Audit log
      const userInfo = await getUserFromRequest(request);
      await createAuditLog({
        ...userInfo,
        action: 'UPDATE',
        entityType: 'PRODUCT',
        entityId: String(id),
        entityName: `${updatedProduct.product_code} - ${updatedProduct.product_type}`,
        details: { 
          productCode: updatedProduct.product_code, 
          productType: updatedProduct.product_type,
          changes: Object.keys(body).filter(k => k !== 'id' && k !== 'filaments')
        }
      });

      // Güncellenmiş ürünü formatla ve döndür
      const formattedProduct = {
        id: updatedProduct.id,
        code: updatedProduct.product_code,
        productType: updatedProduct.product_type,
        image: updatedProduct.image_path,
        barcode: updatedProduct.barcode || '',
        capacity: updatedProduct.capacity || 0,
        dimensionX: updatedProduct.dimension_x || 0,
        dimensionY: updatedProduct.dimension_y || 0,
        dimensionZ: updatedProduct.dimension_z || 0,
        printTime: updatedProduct.print_time || 0,
        totalGram: updatedProduct.total_gram || 0,
        pieceGram: updatedProduct.piece_gram || 0,
        filePath: updatedProduct.file_path,
        notes: updatedProduct.notes || '',
        createdAt: updatedProduct.created_at,
        updatedAt: updatedProduct.updated_at,
        filaments: Array.isArray(filaments) ? filaments : []
      };

      return NextResponse.json(formattedProduct);

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Ürün güncelleme hatası:', error);
    console.error('Hata detayları:', {
      message: error instanceof Error ? error.message : 'Bilinmeyen hata',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Ürün güncellenirken bir hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
}