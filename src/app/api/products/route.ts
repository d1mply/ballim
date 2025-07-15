import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Tüm ürünleri getir
export async function GET() {
  try {
    // Filament detaylarını ve basitleştirilmiş stok durumunu getir
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
        COALESCE(i.quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      ORDER BY p.product_code
    `);
    
    // Snake case alanları camelCase'e dönüştür ve yapıyı frontend ile uyumlu hale getir
    const products = result.rows.map(product => {
      const { 
        id,
        product_code, 
        product_type, 
        image_path, 
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
        stock_quantity,
        filaments
      } = product;
      
      return {
        id,
        code: product_code,
        productType: product_type,
        image: image_path,
        capacity: capacity || 0,
        dimensionX: dimension_x || 0,
        dimensionY: dimension_y || 0,
        dimensionZ: dimension_z || 0,
        printTime: print_time || 0,
        totalGram: total_gram || 0,
        pieceGram: piece_gram || 0,
        filePath: file_path,
        notes: notes || '',
        stockQuantity: parseInt(stock_quantity) || 0,
        createdAt: created_at,
        updatedAt: updated_at,
        filaments: Array.isArray(filaments) ? filaments : []
      };
    });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('Ürünleri getirme hatası:', error);
    return NextResponse.json(
      { error: 'Ürünler getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Yeni ürün ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Gelen ürün verileri:", body);
    
    const {
      code,
      productType,
      image,
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
    
    // Ürün kodunu kullan veya otomatik oluştur
    let productCode = code;
    if (!productCode) {
      // Ürün kodunu otomatik oluştur (AA001, AA002, ...)
      const countResult = await query(`
        SELECT COUNT(*) FROM products
      `);
      
      const count = parseInt(countResult.rows[0].count) + 1;
      productCode = `AA${count.toString().padStart(3, '0')}`;
    }
    
    // Ana ürün kaydını oluştur
    const productResult = await query(`
      INSERT INTO products (
        product_code, product_type, image_path, capacity,
        dimension_x, dimension_y, dimension_z, print_time,
        total_gram, piece_gram, file_path, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      productCode, 
      productType, 
      image, 
      capacity || 0,
      dimensionX || 0, 
      dimensionY || 0, 
      dimensionZ || 0, 
      printTime || 0,
      totalGram || 0, 
      pieceGram || 0, 
      filePath || '', 
      notes || ''
    ]);
    
    const productId = productResult.rows[0].id;
    
    // Filamentleri ekle
    if (filaments && filaments.length > 0) {
      for (const filament of filaments) {
        // Filament tipi boş olanları atla
        if (!filament.type || filament.type.trim() === '') {
          console.warn('Boş filament tipi atlandı:', filament);
          continue;
        }
        
        await query(`
          INSERT INTO product_filaments (
            product_id, filament_type, filament_color, 
            filament_density, weight
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [
          productId, 
          filament.type,
          filament.color || '',
          filament.brand || '', // brand değerini filament_density alanında tutuyoruz
          filament.weight || 0
        ]);
      }
    }
    
    // Stokta varsayılan olarak 0 adet olarak kaydet
    await query(`
      INSERT INTO inventory (product_id, quantity)
      VALUES ($1, 0)
    `, [productId]);
    
    // Tüm detaylarıyla birlikte ürünü döndür
    const completeProductResult = await query(`
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
        COALESCE(i.quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.id = $1
    `, [productId]);
    
    // Frontend yapısına uygun formata dönüştür
    const { 
      id,
      product_code, 
      product_type, 
      image_path, 
      dimension_x, 
      dimension_y, 
      dimension_z, 
      print_time, 
      total_gram, 
      piece_gram, 
      file_path, 
      stock_quantity
    } = completeProductResult.rows[0];
    
    const formattedProduct = {
      id,
      code: product_code,
      productType: product_type,
      image: image_path,
      capacity: capacity || 0,
      dimensionX: dimension_x || 0,
      dimensionY: dimension_y || 0,
      dimensionZ: dimension_z || 0,
      printTime: print_time || 0,
      totalGram: total_gram || 0,
      pieceGram: piece_gram || 0,
      filePath: file_path,
      notes: notes || '',
      stockQuantity: stock_quantity || 0,
      filaments: completeProductResult.rows[0].filaments || []
    };
    
    return NextResponse.json(formattedProduct, { status: 201 });
  } catch (error) {
    console.error('Ürün ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Ürün eklenirken bir hata oluştu', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Ürün güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Güncelleme için gelen veriler:", JSON.stringify(body, null, 2));
    
    const { id, filaments, image, code, productType, ...restData } = body;
    
    if (!id) {
      console.error("Ürün ID eksik:", body);
      return NextResponse.json(
        { error: 'Ürün ID gerekli' },
        { status: 400 }
      );
    }
    
    console.log("Ürün ID:", id);
    console.log("Filamentler:", filaments);
    console.log("Geri kalan veriler:", restData);
    
    // Frontend'den gelen verileri veritabanı formatına dönüştür
    const updateData: Record<string, string | number | boolean> = {
      product_code: code,
      product_type: productType,
      image_path: image,
      ...restData
    };

    // stock_quantity'yi updateData'dan çıkar çünkü bu products tablosuna ait bir alan değil
    delete updateData.stockQuantity;
    
    console.log("Update data (ham):", updateData);
    
    // Güncelleme sorgusunu dinamik olarak oluştur
    const snakeCaseMapping: Record<string, string> = {
      capacity: 'capacity',
      dimensionX: 'dimension_x',
      dimensionY: 'dimension_y',
      dimensionZ: 'dimension_z',
      printTime: 'print_time',
      totalGram: 'total_gram',
      pieceGram: 'piece_gram',
      filePath: 'file_path',
      notes: 'notes'
    };
    
    // CamelCase anahtarları snake_case'e dönüştür
    const updateFields: Record<string, string | number | boolean> = {};
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        const snakeKey = snakeCaseMapping[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields[snakeKey] = updateData[key];
        console.log(`Mapping: ${key} -> ${snakeKey} = ${updateData[key]}`);
      }
    });
    
    console.log("Dönüştürülmüş updateFields:", updateFields);
    
    // Sorgu parametrelerini hazırla
    const keys = Object.keys(updateFields);
    console.log("Güncellenecek alanlar:", keys);
    
    if (keys.length === 0) {
      // Eğer güncellenecek alan yoksa, sadece filamentleri güncelle
      console.log("Güncellenecek alan bulunamadı, sadece filamentler güncelleniyor.");
    } else {
      try {
        // Sorgu oluştur
        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [id, ...Object.values(updateFields)];
        
        console.log("Güncelleme sorgusu:", `UPDATE products SET ${setClause} WHERE id = $1`);
        console.log("Değerler:", values);
        
        const result = await query(`
          UPDATE products
          SET ${setClause}
          WHERE id = $1
          RETURNING *
        `, values);
        
        console.log("Güncelleme sonucu:", result.rowCount, "satır etkilendi");
        
        if (result.rowCount === 0) {
          console.error("Ürün bulunamadı, ID:", id);
          return NextResponse.json(
            { error: 'Ürün bulunamadı' },
            { status: 404 }
          );
        }
      } catch (updateError) {
        console.error("Ana ürün güncelleme hatası:", updateError);
        throw updateError;
      }
    }
    
    // Filamentleri güncelle
    if (filaments && filaments.length > 0) {
      console.log("Filament güncelleme başlıyor, toplam:", filaments.length);
      
      try {
        // Önce mevcut filamentleri sil
        console.log("Mevcut filamentler siliniyor...");
        const deleteResult = await query(`
          DELETE FROM product_filaments
          WHERE product_id = $1
        `, [id]);
        
        console.log("Silinen filament sayısı:", deleteResult.rowCount);
        
        // Yeni filamentleri ekle - sadece geçerli olanları
        let addedCount = 0;
        for (const filament of filaments) {
          // Filament tipi boş olanları atla
          if (!filament.type || filament.type.trim() === '') {
            console.warn('Güncelleme sırasında boş filament tipi atlandı:', filament);
            continue;
          }
          
          console.log(`Filament ekleniyor: ${filament.type} - ${filament.color} - ${filament.brand} - ${filament.weight}g`);
          
          await query(`
            INSERT INTO product_filaments (
              product_id, filament_type, filament_color, 
              filament_density, weight
            )
            VALUES ($1, $2, $3, $4, $5)
          `, [
            id, 
            filament.type,
            filament.color || '',
            filament.brand || '', // brand değerini filament_density alanında tutuyoruz
            filament.weight || 0
          ]);
          
          addedCount++;
        }
        
        console.log("Eklenen filament sayısı:", addedCount);
      } catch (filamentError) {
        console.error("Filament güncelleme hatası:", filamentError);
        throw filamentError;
      }
    } else {
      console.log("Filament güncellemesi yapılmayacak (boş veya undefined)");
    }
    
    // Güncellenmiş ürünü getir
    const updatedProductResult = await query(`
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
        COALESCE(i.quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.id = $1
    `, [id]);
    
    if (updatedProductResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Güncellenmiş ürün bulunamadı' },
        { status: 404 }
      );
    }
    
    // Frontend yapısına uygun formata dönüştür
    const { 
      product_code, 
      product_type, 
      image_path, 
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
      stock_quantity 
    } = updatedProductResult.rows[0];
    
    const formattedProduct = {
      id,
      code: product_code,
      productType: product_type,
      image: image_path,
      capacity: capacity || 0,
      dimensionX: dimension_x || 0,
      dimensionY: dimension_y || 0,
      dimensionZ: dimension_z || 0,
      printTime: print_time || 0,
      totalGram: total_gram || 0,
      pieceGram: piece_gram || 0,
      filePath: file_path,
      notes: notes || '',
      stockQuantity: parseInt(stock_quantity) || 0,
      createdAt: created_at,
      updatedAt: updated_at,
      filaments: updatedProductResult.rows[0].filaments || []
    };
    
    return NextResponse.json(formattedProduct);
  } catch (error) {
    console.error('Ürün güncelleme hatası - Ana catch bloğu:', error);
    console.error('Hata stack:', error instanceof Error ? error.stack : 'Stack bulunamadı');
    console.error('Hata mesajı:', error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { 
        error: 'Ürün güncellenirken bir hata oluştu', 
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}

// Ürün sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Ürün ID gerekli' },
        { status: 400 }
      );
    }
    
    // Cascade ayarlandığı için ürün silindi
    const result = await query(`
      DELETE FROM products
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Ürün başarıyla silindi' });
  } catch (error) {
    console.error('Ürün silme hatası:', error);
    return NextResponse.json(
      { error: 'Ürün silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 