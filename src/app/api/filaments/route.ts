import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { handleApiError, handleDatabaseError, validateFilamentData } from '../../../lib/errors';

// Tüm filamentleri getir
export async function GET() {
  try {
    const result = await query(`
      SELECT * FROM filaments
      ORDER BY filament_code
    `);
    
    // Kolon isimlerini camelCase'e dönüştür
    const filaments = result.rows.map(row => ({
      id: row.id,
      code: row.filament_code,
      name: row.name,
      type: row.type,
      brand: row.brand,
      color: row.color,
      location: row.location,
      totalWeight: row.total_weight,
      remainingWeight: row.remaining_weight,
      quantity: row.quantity,
      criticalStock: row.critical_stock,
      tempRange: row.temp_range,
      cap: row.cap,
      pricePerGram: row.price_per_gram,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    return NextResponse.json(filaments);
  } catch (error) {
    const errorResponse = handleApiError(handleDatabaseError(error));
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

// Yeni filament ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    const validatedData = validateFilamentData(body);
    const { type, color, brand, totalWeight, remainingWeight } = validatedData;
    
    const {
      location = '',
      quantity = 1,
      criticalStock = 0,
      tempRange = '',
      cap = 0,
      pricePerGram = 0
    } = body;
    
    // Filament rulo formatı: PLA-AÇIKMAVI-001 (tip + renk + sıra)
    const typeUpper = type.toUpperCase();
    
    // Renk kısaltması - boşlukları kaldır ve büyük harfe çevir
    let colorShort = color.replace(/\s/g, '').toUpperCase(); // Boşlukları kaldır
    
    // Aynı tip ve renkte kaç filament var bul
    console.log('Veritabanı sorgusu başlatılıyor...');
    const countResult = await query(`
      SELECT COUNT(*) 
      FROM filaments 
      WHERE type = $1 AND color = $2
    `, [type, color]);
    
    console.log('Count sonucu:', countResult.rows[0]);
    const count = parseInt(countResult.rows[0].count) + 1;
    const filamentCode = `${typeUpper}-${colorShort}-${count.toString().padStart(3, '0')}`;
    
    console.log('Renk kodu:', colorShort);
    console.log('Oluşturulan kod:', filamentCode);
    console.log('Kod uzunluğu:', filamentCode.length);
    
    // Name alanını otomatik oluştur (marka + renk)
    const autoName = `${brand} ${color}`;
    console.log('Otomatik name:', autoName);
    
    const result = await query(`
      INSERT INTO filaments (
        filament_code, name, type, brand, color, location, 
        total_weight, remaining_weight, quantity, critical_stock,
        temp_range, cap, price_per_gram
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      filamentCode, autoName, type, brand, color, location,
      totalWeight, remainingWeight, quantity, criticalStock,
      tempRange, cap, pricePerGram
    ]);
    
    // Kolon isimlerini camelCase'e dönüştür
    const newFilament = {
      id: result.rows[0].id,
      code: result.rows[0].filament_code,
      name: result.rows[0].name,
      type: result.rows[0].type, 
      brand: result.rows[0].brand,
      color: result.rows[0].color,
      location: result.rows[0].location,
      totalWeight: result.rows[0].total_weight,
      remainingWeight: result.rows[0].remaining_weight,
      quantity: result.rows[0].quantity,
      criticalStock: result.rows[0].critical_stock,
      tempRange: result.rows[0].temp_range,
      cap: result.rows[0].cap,
      pricePerGram: result.rows[0].price_per_gram,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
    
    return NextResponse.json(newFilament, { status: 201 });
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

// Filament güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Filament ID gerekli' },
        { status: 400 }
      );
    }
    
    // Güncellenecek alanları doğru kolona eşle
    const fieldMapping = {
      'name': 'name',
      'type': 'type',
      'brand': 'brand',
      'color': 'color',
      'location': 'location',
      'totalWeight': 'total_weight',
      'remainingWeight': 'remaining_weight',
      'quantity': 'quantity',
      'criticalStock': 'critical_stock',
      'tempRange': 'temp_range',
      'cap': 'cap',
      'pricePerGram': 'price_per_gram',
    };
    
    // SQL parametreleri ve set ifadesi oluştur
    const setParams = [];
    const params = [id];
    let paramIndex = 2;
    
    Object.entries(updateData).forEach(([key, value]) => {
      const dbField = fieldMapping[key];
      if (dbField) {
        setParams.push(`${dbField} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });
    
    // Güncelleme zamanını ekle
    setParams.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    
    // SQL sorgusu
    const sqlQuery = `
      UPDATE filaments
      SET ${setParams.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await query(sqlQuery, params);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Filament bulunamadı' },
        { status: 404 }
      );
    }
    
    // Kolon isimlerini camelCase'e dönüştür
    const updatedFilament = {
      id: result.rows[0].id,
      code: result.rows[0].filament_code,
      name: result.rows[0].name,
      type: result.rows[0].type, 
      brand: result.rows[0].brand,
      color: result.rows[0].color,
      location: result.rows[0].location,
      totalWeight: result.rows[0].total_weight,
      remainingWeight: result.rows[0].remaining_weight,
      quantity: result.rows[0].quantity,
      criticalStock: result.rows[0].critical_stock,
      tempRange: result.rows[0].temp_range,
      cap: result.rows[0].cap,
      pricePerGram: result.rows[0].price_per_gram,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
    
    return NextResponse.json(updatedFilament);
  } catch (error) {
    console.error('Filament güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Filament güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// Filament sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Filament ID gerekli' },
        { status: 400 }
      );
    }
    
    const result = await query(`
      DELETE FROM filaments
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Filament bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Filament başarıyla silindi',
      deletedId: id
    });
  } catch (error) {
    console.error('Filament silme hatası:', error);
    return NextResponse.json(
      { error: 'Filament silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 