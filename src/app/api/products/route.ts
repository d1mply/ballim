import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { createAuditLog, getUserFromRequest } from '../../../lib/audit-log';
import { STOCK_COLORS } from '../../../lib/stock';
import { validateAPIInput, validateProductCode, validateID } from '../../../lib/api-validation';
import { getClientIP, logSecurityEvent } from '../../../lib/security';

// Ürünleri getir - sayfalama ve kategori filtresi destekli
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '0', 10)));
    const category = searchParams.get('category') || '';
    const all = searchParams.get('all') === 'true' || limit === 0;

    const categoryFilter = category ? `AND LOWER(p.product_type) LIKE LOWER($1)` : '';
    const categoryParam = category ? [`%${category}%`] : [];

    const countResult = await query(
      `SELECT COUNT(*) FROM products p WHERE 1=1 ${categoryFilter}`,
      categoryParam
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const effectiveLimit = all ? totalCount || 1000 : limit || 50;
    const offset = all ? 0 : (page - 1) * effectiveLimit;

    const queryParams = category
      ? [`%${category}%`, effectiveLimit, offset]
      : [effectiveLimit, offset];

    const limitPlaceholder = category ? '$2' : '$1';
    const offsetPlaceholder = category ? '$3' : '$2';

    const result = await query(`
      WITH reserved_stock AS (
        SELECT 
          product_id, 
          SUM(quantity) as total_reserved
        FROM order_items
        WHERE status IN ('onay_bekliyor', 'uretiliyor', 'uretildi', 'hazirlaniyor')
        GROUP BY product_id
      )
      SELECT 
        p.*,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pf.id,
            'type', pf.filament_type,
            'color', pf.filament_color,
            'brand', pf.filament_density,
            'weight', pf.weight
          ))
          FROM product_filaments pf
          WHERE pf.product_id = p.id),
          '[]'::json
        ) as filaments,
        COALESCE(i.quantity, 0) as inventory_quantity,
        COALESCE(rs.total_reserved, 0) as total_ordered
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      LEFT JOIN reserved_stock rs ON rs.product_id = p.id
      WHERE 1=1 ${categoryFilter}
      ORDER BY p.product_code ASC, p.product_type ASC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `, queryParams);
    
    // Stok hesaplama mantığını uygula ve frontend ile uyumlu hale getir
    const products = result.rows.map((product) => {
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
        filaments,
        inventory_quantity,
        total_ordered
      } = product;
      
      // Stok hesaplama mantığı (getStockStatus mantığına göre)
      let availableStock = parseInt(inventory_quantity) || 0;
      let reservedStock = 0;
      
      const totalOrdered = parseInt(total_ordered) || 0;
      
      // DOĞRU HESAPLAMA:
      // Eğer sipariş <= stok: Mevcut stok = stok - sipariş, Rezerve = 0
      // Eğer sipariş > stok: Mevcut stok = 0, Rezerve = sipariş - stok
      if (totalOrdered <= availableStock) {
        availableStock = availableStock - totalOrdered;
        reservedStock = 0;
      } else {
        reservedStock = totalOrdered - availableStock;
        availableStock = 0;
      }
      
      const totalStock = availableStock + reservedStock;
      
      // Stok durumunu belirle
      let stockDisplay = '';
      let stockColor = '';
      
      if (availableStock > 0) {
        if (reservedStock > 0) {
          stockDisplay = `${availableStock} adet (${reservedStock} rezerve)`;
          stockColor = STOCK_COLORS.IN_STOCK;
        } else {
          stockDisplay = `${availableStock} adet`;
          stockColor = STOCK_COLORS.IN_STOCK;
        }
      } else if (reservedStock > 0) {
        stockDisplay = `0 adet (${reservedStock} rezerve)`;
        stockColor = STOCK_COLORS.RESERVED;
      } else {
        stockDisplay = 'Stokta Yok';
        stockColor = STOCK_COLORS.OUT_OF_STOCK;
      }
      
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
        stockQuantity: availableStock, // Geriye uyumluluk için
        availableStock,
        reservedStock,
        totalStock,
        stockDisplay,
        stockColor,
        createdAt: created_at,
        updatedAt: updated_at,
        filaments: Array.isArray(filaments) ? filaments : []
      };
    });
    
    const totalPages = all ? 1 : Math.ceil(totalCount / effectiveLimit);

    const responseBody = all
      ? products
      : {
          data: products,
          pagination: {
            page,
            limit: effectiveLimit,
            total: totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };

    return NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
      },
    });
  } catch (error) {
    console.error('Ürünleri getirme hatası:', error);
    return NextResponse.json(
      {
        error: 'Ürünler getirilirken bir hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata',
      },
      { status: 500 }
    );
  }
}

// Yeni ürün oluştur
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    const body = await request.json();
    
    // 🛡️ Güvenlik: Input validation ve sanitization
    const validation = validateAPIInput(body, {
      sanitize: true,
      validateSQL: true,
      required: ['productCode', 'productType'],
      types: {
        productCode: 'string',
        productType: 'string',
        imagePath: 'string',
        barcode: 'string',
        capacity: 'number',
        dimensionX: 'number',
        dimensionY: 'number',
        dimensionZ: 'number',
        printTime: 'number',
        totalGram: 'number',
        pieceGram: 'number',
        filePath: 'string',
        notes: 'string',
        filaments: 'array',
      },
      maxLengths: {
        productCode: 50,
        productType: 100,
        barcode: 50,
        filePath: 500,
        notes: 1000,
      },
    });

    if (!validation.isValid || !validation.sanitizedData) {
      logSecurityEvent('PRODUCT_CREATE_VALIDATION_FAILED', {
        ip: clientIP,
        errors: validation.errors,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { 
          error: 'Validation hatası',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

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
      filaments
    } = validation.sanitizedData;

    // 🛡️ Güvenlik: Product code format kontrolü
    if (!validateProductCode(productCode)) {
      logSecurityEvent('INVALID_PRODUCT_CODE_FORMAT', {
        ip: clientIP,
        productCode: productCode,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { error: 'Ürün kodu formatı geçersiz. Sadece harf, rakam, tire ve alt çizgi kullanılabilir (3-50 karakter)' },
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

      // Filamentleri ekle - Validation ile
      if (filaments && Array.isArray(filaments) && filaments.length > 0) {
        for (const filament of filaments) {
          // 🛡️ Güvenlik: Filament validation
          const filamentValidation = validateAPIInput(filament, {
            sanitize: true,
            validateSQL: true,
            types: {
              type: 'string',
              color: 'string',
              brand: 'string',
              weight: 'number',
            },
            maxLengths: {
              type: 50,
              color: 50,
              brand: 100,
            },
          });

          if (!filamentValidation.isValid || !filamentValidation.sanitizedData) {
            await query('ROLLBACK');
            logSecurityEvent('FILAMENT_VALIDATION_FAILED', {
              ip: clientIP,
              productCode: productCode,
              errors: filamentValidation.errors,
              timestamp: new Date().toISOString(),
            }, 'MEDIUM');
            
            return NextResponse.json(
              { 
                error: 'Filament validation hatası',
                details: filamentValidation.errors 
              },
              { status: 400 }
            );
          }

          const sanitizedFilament = filamentValidation.sanitizedData;
          
          await query(`
            INSERT INTO product_filaments (
              product_id, filament_type, filament_color, filament_density, weight
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            newProduct.id,
            sanitizedFilament.type || '',
            sanitizedFilament.color || '',
            sanitizedFilament.brand || '',
            typeof sanitizedFilament.weight === 'number' ? sanitizedFilament.weight : 0
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
  const clientIP = getClientIP(request);
  
  try {
    const body = await request.json();
    
    // 🛡️ Güvenlik: ID validation
    if (!body.id) {
      logSecurityEvent('PRODUCT_UPDATE_MISSING_ID', {
        ip: clientIP,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { error: 'Ürün ID gerekli' },
        { status: 400 }
      );
    }

    // ID'nin geçerli olduğunu kontrol et
    if (!validateID(body.id)) {
      logSecurityEvent('INVALID_PRODUCT_ID', {
        ip: clientIP,
        id: body.id,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { error: 'Geçersiz ürün ID formatı' },
        { status: 400 }
      );
    }

    // 🛡️ Güvenlik: Input validation ve sanitization
    const validation = validateAPIInput(body, {
      sanitize: true,
      validateSQL: true,
      types: {
        id: 'number',
        productCode: 'string',
        productType: 'string',
        imagePath: 'string',
        barcode: 'string',
        capacity: 'number',
        dimensionX: 'number',
        dimensionY: 'number',
        dimensionZ: 'number',
        printTime: 'number',
        totalGram: 'number',
        pieceGram: 'number',
        filePath: 'string',
        notes: 'string',
        filaments: 'array',
      },
      maxLengths: {
        productCode: 50,
        productType: 100,
        barcode: 50,
        filePath: 500,
        notes: 1000,
      },
    });

    if (!validation.isValid || !validation.sanitizedData) {
      logSecurityEvent('PRODUCT_UPDATE_VALIDATION_FAILED', {
        ip: clientIP,
        productId: body.id,
        errors: validation.errors,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { 
          error: 'Validation hatası',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

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
    } = validation.sanitizedData;

    // 🛡️ Güvenlik: Product code format kontrolü (eğer değiştiriliyorsa)
    if (productCode && !validateProductCode(productCode)) {
      logSecurityEvent('INVALID_PRODUCT_CODE_FORMAT_UPDATE', {
        ip: clientIP,
        productId: id,
        productCode: productCode,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { error: 'Ürün kodu formatı geçersiz. Sadece harf, rakam, tire ve alt çizgi kullanılabilir (3-50 karakter)' },
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

      // Filamentleri güncelle (önce sil, sonra ekle) - Validation ile
      if (filaments !== undefined) {
        // Mevcut filamentleri sil
        await query(
          'DELETE FROM product_filaments WHERE product_id = $1',
          [id]
        );

        // Yeni filamentleri ekle - Validation ile
        if (Array.isArray(filaments) && filaments.length > 0) {
          for (const filament of filaments) {
            // 🛡️ Güvenlik: Filament validation
            const filamentValidation = validateAPIInput(filament, {
              sanitize: true,
              validateSQL: true,
              types: {
                type: 'string',
                color: 'string',
                brand: 'string',
                weight: 'number',
              },
              maxLengths: {
                type: 50,
                color: 50,
                brand: 100,
              },
            });

            if (!filamentValidation.isValid || !filamentValidation.sanitizedData) {
              await query('ROLLBACK');
              logSecurityEvent('FILAMENT_UPDATE_VALIDATION_FAILED', {
                ip: clientIP,
                productId: id,
                errors: filamentValidation.errors,
                timestamp: new Date().toISOString(),
              }, 'MEDIUM');
              
              return NextResponse.json(
                { 
                  error: 'Filament validation hatası',
                  details: filamentValidation.errors 
                },
                { status: 400 }
              );
            }

            const sanitizedFilament = filamentValidation.sanitizedData;
            
            await query(`
              INSERT INTO product_filaments (
                product_id, filament_type, filament_color, filament_density, weight
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              id,
              sanitizedFilament.type || '',
              sanitizedFilament.color || '',
              sanitizedFilament.brand || '',
              typeof sanitizedFilament.weight === 'number' ? sanitizedFilament.weight : 0
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