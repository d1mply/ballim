import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { validateAPIInput, validateEmail, validatePhone } from '../../../lib/api-validation';
import { getClientIP, logSecurityEvent } from '../../../lib/security';

// Tüm müşterileri getir
export async function GET() {
  try {
    // Önce veritabanı bağlantısını test et
    try {
      await query('SELECT 1');
    } catch (dbError) {
      return NextResponse.json(
        { error: 'Veritabanı bağlantısında hata oluştu' },
        { status: 500 }
      );
    }
    
    // Önce tabloların mevcut olup olmadığını kontrol et
    try {
      const customersTableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customers'
        ) as table_exists;
      `);
      
      if (!customersTableCheck.rows[0].table_exists) {
        console.error("'customers' tablosu bulunamadı");
        return NextResponse.json(
          { error: `'customers' tablosu bulunamadı. Veritabanı şemaları oluşturulmamış olabilir.` },
          { status: 500 }
        );
      }
      
      const ordersTableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'orders'
        ) as table_exists;
      `);
      
      const ordersTableExists = ordersTableCheck.rows[0].table_exists;
      
      // Ana müşteri bilgilerini getir
      let result;
      if (ordersTableExists) {
        result = await query(`
          SELECT c.* 
          FROM customers c
          ORDER BY c.name
        `);
      } else {
        console.warn("'orders' tablosu bulunamadı, sipariş bilgileri olmadan devam ediliyor");
        result = await query(`
          SELECT * FROM customers
          ORDER BY name
        `);
      }
      
      // Müşteri sonucu boş geldi mi?
      if (!result.rows || result.rows.length === 0) {
        return NextResponse.json([]);
      }
      
      // Her müşteri için filament fiyatlarını getir
      const customers = [];
      
      for (const customer of result.rows) {
        try {
          // Filament fiyatlarını al
          let filamentPrices = [];
          try {
            const filamentTableCheck = await query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'customer_filament_prices'
              ) as table_exists;
            `);
            
            if (filamentTableCheck.rows[0].table_exists) {
              const filamentPricesResult = await query(`
                SELECT filament_type, price_per_gram 
                FROM customer_filament_prices
                WHERE customer_id = $1
              `, [customer.id]);
              
              filamentPrices = filamentPricesResult.rows.map(row => ({
                type: row.filament_type,
                price: row.price_per_gram
              }));
            }
          } catch (filamentError) {
            console.error(`Müşteri ${customer.id} için filament fiyatları getirilirken hata:`, filamentError);
            filamentPrices = [];
          }
          
          // Sipariş sayısını ve tutarını al
          let orderCount = 0;
          let totalSpent = 0;
          let lastOrderDate = null;
          
          if (ordersTableExists) {
            try {
              const orderCountResult = await query(`
                SELECT COUNT(*) as count FROM orders WHERE customer_id = $1
              `, [customer.id]);
              orderCount = parseInt(orderCountResult.rows[0].count) || 0;
              
              const totalSpentResult = await query(`
                SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE customer_id = $1
              `, [customer.id]);
              totalSpent = parseFloat(totalSpentResult.rows[0].total) || 0;
              
              const lastOrderResult = await query(`
                SELECT MAX(order_date) as last_date FROM orders WHERE customer_id = $1
              `, [customer.id]);
              lastOrderDate = lastOrderResult.rows[0].last_date;
            } catch (orderError) {
              console.error(`Müşteri ${customer.id} için sipariş bilgileri getirilirken hata:`, orderError);
            }
          }
          
          // Snake case alanları camelCase'e dönüştür
          const { 
            customer_code, 
            customer_type, 
            tax_number,
            customer_category,
            discount_rate,
            created_at, 
            updated_at,
            ...rest 
          } = customer;
          
          customers.push({
            ...rest,
            customerCode: customer_code || '',
            type: customer_type || 'Bireysel',
            taxNumber: tax_number || '',
            customerCategory: customer_category || 'normal',
            discountRate: discount_rate || 0,
            orderCount: orderCount,
            totalSpent: totalSpent,
            lastOrderDate: lastOrderDate ? new Date(lastOrderDate).toLocaleDateString('tr-TR') : '-',
            filamentPrices: filamentPrices,
            createdAt: created_at,
            updatedAt: updated_at
          });
        } catch (customerError) {
          console.error(`Müşteri ${customer.id} bilgileri işlenirken hata:`, customerError);
          // Hataya rağmen devam et
        }
      }
      
      // Ürün sayısı ve toplam tutar hesaplama
      const customerStats = await Promise.all(
        customers.map(async (customer: { id: number; orderCount: number; totalSpent: number; lastOrderDate: string; [key: string]: unknown }) => {
          await query('UPDATE customers SET orders_count = $1, total_spent = $2 WHERE id = $3', 
            [customer.orderCount, customer.totalSpent, customer.id]
          );
          
          return {
            ...customer,
            orders_count: customer.orderCount,
            total_spent: customer.totalSpent,
            last_order_date: customer.orderCount > 0 ? new Date(customer.lastOrderDate) : null
          };
        })
      );
      
      // 🚀 PERFORMANS: Cache headers (30 saniye cache - customers orta sıklıkta değişir)
      return NextResponse.json(customerStats, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=180',
          'CDN-Cache-Control': 'public, s-maxage=30',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=30',
        },
      });
    } catch (tableCheckError) {
      console.error('Tablo kontrol hatası:', tableCheckError);
      return NextResponse.json(
        { error: `Tablo kontrol hatası: ${tableCheckError.message || 'Bilinmeyen hata'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Müşterileri getirme hatası:', error);
    return NextResponse.json(
      { error: `Müşteriler getirilirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    );
  }
}

// Yeni müşteri ekle
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    const body = await request.json();
    
    // 🛡️ Güvenlik: Input validation ve sanitization
    const validation = validateAPIInput(body, {
      sanitize: true,
      validateSQL: true,
      required: ['name', 'phone', 'email', 'username', 'password'],
      types: {
        name: 'string',
        company: 'string',
        phone: 'string',
        email: 'string',
        address: 'string',
        notes: 'string',
        type: 'string',
        taxNumber: 'string',
        username: 'string',
        password: 'string',
        customerCategory: 'string',
        discountRate: 'number',
        filamentPrices: 'array',
      },
      maxLengths: {
        name: 100,
        company: 100,
        phone: 20,
        email: 100,
        address: 500,
        notes: 1000,
        taxNumber: 20,
        username: 50,
        password: 255,
      },
    });

    if (!validation.isValid || !validation.sanitizedData) {
      logSecurityEvent('CUSTOMER_CREATE_VALIDATION_FAILED', {
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
      name,
      company,
      phone,
      email,
      address,
      notes,
      type = 'Bireysel',
      taxNumber,
      username,
      password,
      customerCategory = 'normal',
      discountRate = 0,
      filamentPrices = []
    } = validation.sanitizedData;

    // 🛡️ Güvenlik: Email format kontrolü
    if (!validateEmail(email)) {
      logSecurityEvent('INVALID_EMAIL_FORMAT', {
        ip: clientIP,
        email: email,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { error: 'Geçersiz email formatı' },
        { status: 400 }
      );
    }

    // 🛡️ Güvenlik: Telefon format kontrolü
    if (!validatePhone(phone)) {
      logSecurityEvent('INVALID_PHONE_FORMAT', {
        ip: clientIP,
        phone: phone,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { error: 'Geçersiz telefon formatı. Türkiye telefon formatı kullanın (örn: 05551234567)' },
        { status: 400 }
      );
    }

    // 🛡️ Güvenlik: Username format kontrolü (alfanümerik, tire, alt çizgi)
    const usernameRegex = /^[A-Za-z0-9_-]+$/;
    if (!usernameRegex.test(username) || username.length < 3 || username.length > 50) {
      logSecurityEvent('INVALID_USERNAME_FORMAT', {
        ip: clientIP,
        username: username,
        timestamp: new Date().toISOString(),
      }, 'MEDIUM');
      
      return NextResponse.json(
        { error: 'Kullanıcı adı formatı geçersiz. Sadece harf, rakam, tire ve alt çizgi kullanılabilir (3-50 karakter)' },
        { status: 400 }
      );
    }
    
    // Müşteri kodunu otomatik oluştur (MUS-001, MUS-002, ...)
    // Güvenli bir şekilde benzersiz kod oluştur
    let customerCode;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      const countResult = await query(`
        SELECT COUNT(*) FROM customers
      `);
      
      const count = parseInt(countResult.rows[0].count) + 1 + attempts;
      customerCode = `MUS-${count.toString().padStart(3, '0')}`;
      
      // Bu kod zaten var mı kontrol et
      const existingCode = await query(`
        SELECT id FROM customers WHERE customer_code = $1
      `, [customerCode]);
      
      if (existingCode.rowCount === 0) {
        break; // Benzersiz kod bulundu
      }
      
      attempts++;
    } while (attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      // Yedek çözüm: timestamp ile benzersiz kod
      const timestamp = Date.now().toString().slice(-6);
      customerCode = `MUS-${timestamp}`;
    }
    
    const result = await query(`
      INSERT INTO customers (
        customer_code, name, company, phone, 
        email, address, notes, customer_type,
        tax_number, username, password, customer_category, discount_rate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      customerCode, name, company, phone,
      email, address, notes, type,
      taxNumber, username, password, customerCategory, discountRate
    ]).catch(error => {
      // Duplicate key hatası için özel mesaj
      if (error.code === '23505' && error.constraint === 'customers_customer_code_key') {
        throw new Error(`Müşteri kodu ${customerCode} zaten kullanımda. Lütfen tekrar deneyin.`);
      }
      throw error;
    });
    
    const customerId = result.rows[0].id;
    
    // Filament fiyatlarını ekle
    for (const filamentPrice of filamentPrices) {
      await query(`
        INSERT INTO customer_filament_prices (
          customer_id, filament_type, price_per_gram
        )
        VALUES ($1, $2, $3)
      `, [
        customerId, 
        filamentPrice.type || 'PLA',
        parseFloat(filamentPrice.price) || 0
      ]);
    }
    
    // Müşteri filament fiyatlarını getir
    const filamentPricesResult = await query(`
      SELECT filament_type, price_per_gram 
      FROM customer_filament_prices
      WHERE customer_id = $1
    `, [customerId]);
    
    const savedFilamentPrices = filamentPricesResult.rows.map(row => ({
      type: row.filament_type,
      price: row.price_per_gram
    }));
    
    // Sipariş istatistiklerini al
    const statsResult = await query(`
      SELECT 
        COALESCE((SELECT COUNT(*) FROM orders WHERE customer_id = $1), 0) as order_count,
        COALESCE((SELECT SUM(total_amount) FROM orders WHERE customer_id = $1), 0) as total_spent,
        (SELECT MAX(order_date) FROM orders WHERE customer_id = $1) as last_order_date
    `, [customerId]);
    
    // Snake case'i camelCase'e dönüştür
    const { 
      customer_code, 
      customer_type, 
      tax_number,
      created_at, 
      updated_at
    } = result.rows[0];
    
    const { order_count, total_spent, last_order_date } = statsResult.rows[0];
    
    const formattedCustomer = {
      ...result.rows[0],
      customerCode: customer_code,
      type: customer_type,
      taxNumber: tax_number,
      orderCount: parseInt(order_count) || 0,
      totalSpent: parseFloat(total_spent) || 0,
      lastOrderDate: last_order_date ? new Date(last_order_date).toLocaleDateString('tr-TR') : '-',
      filamentPrices: savedFilamentPrices,
      createdAt: created_at,
      updatedAt: updated_at
    };
    
    return NextResponse.json(formattedCustomer, { status: 201 });
  } catch (error) {
    console.error('Müşteri ekleme hatası:', error);
    return NextResponse.json(
      { error: `Müşteri eklenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    );
  }
}

// Müşteri güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Güncelleme için gelen veriler:", body);
    
    const { id, filamentPrices, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Müşteri ID gerekli' },
        { status: 400 }
      );
    }
    
    // Müşterinin var olduğunu kontrol et
    const checkCustomer = await query(`
      SELECT * FROM customers WHERE id = $1
    `, [id]);
    
    if (checkCustomer.rowCount === 0) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }
    
    // Müşteri bilgilerini güncelle
    const snakeCaseMapping: Record<string, string> = {
      'customerCode': 'customer_code',
      'type': 'customer_type',
      'taxNumber': 'tax_number'
    };
    
    // CamelCase anahtarları snake_case'e dönüştür
    const updateFields: Record<string, string | number | boolean> = {};
    Object.entries(updateData).forEach(([key, value]) => {
      if (!['orderCount', 'totalSpent', 'lastOrderDate'].includes(key)) {
        const snakeKey = snakeCaseMapping[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields[snakeKey] = value;
      }
    });
    
    // Sorgu oluştur
    const keys = Object.keys(updateFields);
    
    if (keys.length === 0) {
      // Güncelleme için alan yoksa, direkt filament fiyatlarını güncelle
      return await updateFilamentPrices(id, filamentPrices);
    }
    
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updateFields), new Date()];
    
    console.log("Güncelleme sorgusu:", `UPDATE customers SET ${setClause}, updated_at = $${values.length} WHERE id = $1`);
    console.log("Değerler:", values);
    
    try {
      const result = await query(`
        UPDATE customers
        SET ${setClause}, updated_at = $${values.length}
        WHERE id = $1
        RETURNING *
      `, values);
      
      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'Müşteri güncellenemedi' },
          { status: 404 }
        );
      }
      
      // Filament fiyatlarını güncelle
      if (filamentPrices && Array.isArray(filamentPrices)) {
        try {
          // Mevcut filament fiyatlarını sil
          await query(`
            DELETE FROM customer_filament_prices
            WHERE customer_id = $1
          `, [id]);
          
          // Yeni filament fiyatlarını ekle
          for (const filamentPrice of filamentPrices) {
            await query(`
              INSERT INTO customer_filament_prices (
                customer_id, filament_type, price_per_gram
              )
              VALUES ($1, $2, $3)
            `, [
              id, 
              filamentPrice.type || 'PLA',
              parseFloat(filamentPrice.price) || 0
            ]);
          }
        } catch (filamentError) {
          console.error('Filament fiyatları güncellenirken hata:', filamentError);
          // Ana güncelleme başarılı olduysa devam et
        }
      }
      
      // Müşteri filament fiyatlarını getir
      const filamentPricesResult = await query(`
        SELECT filament_type, price_per_gram 
        FROM customer_filament_prices
        WHERE customer_id = $1
      `, [id]);
      
      const savedFilamentPrices = filamentPricesResult.rows.map(row => ({
        type: row.filament_type,
        price: row.price_per_gram
      }));
      
      try {
        // Müşteri siparişleri hakkında ek bilgi al
        const statsResult = await query(`
          SELECT 
            COALESCE((SELECT COUNT(*) FROM orders WHERE customer_id = $1), 0) as order_count,
            COALESCE((SELECT SUM(total_amount) FROM orders WHERE customer_id = $1), 0) as total_spent,
            (SELECT MAX(order_date) FROM orders WHERE customer_id = $1) as last_order_date
        `, [id]);
        
        // Snake case'i camelCase'e dönüştür
        const { 
          customer_code, 
          customer_type, 
          tax_number,
          created_at, 
          updated_at,
          ...rest 
        } = result.rows[0];
        
        const { order_count, total_spent, last_order_date } = statsResult.rows[0];
        
        const formattedCustomer = {
          ...rest,
          customerCode: customer_code || '',
          type: customer_type || 'Bireysel',
          taxNumber: tax_number || '',
          orderCount: parseInt(order_count) || 0,
          totalSpent: parseFloat(total_spent) || 0,
          lastOrderDate: last_order_date ? new Date(last_order_date).toLocaleDateString('tr-TR') : '-',
          filamentPrices: savedFilamentPrices,
          createdAt: created_at,
          updatedAt: updated_at
        };
        
        return NextResponse.json(formattedCustomer);
      } catch (statsError) {
        console.error('Müşteri istatistikleri getirilirken hata:', statsError);
        
        // Basit bir yanıt döndür
        const { 
          customer_code, 
          customer_type, 
          tax_number,
          created_at, 
          updated_at
        } = result.rows[0];
        
        return NextResponse.json({
          ...result.rows[0],
          customerCode: customer_code || '',
          type: customer_type || 'Bireysel',
          taxNumber: tax_number || '',
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: '-',
          filamentPrices: savedFilamentPrices,
          createdAt: created_at,
          updatedAt: updated_at
        });
      }
    } catch (updateError) {
      console.error('Müşteri güncelleme SQL hatası:', updateError);
      return NextResponse.json(
        { error: `Müşteri güncellenirken veritabanı hatası: ${updateError.message || 'Bilinmeyen SQL hatası'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Müşteri güncelleme hatası:', error);
    return NextResponse.json(
      { error: `Müşteri güncellenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    );
  }
}

// Sadece filament fiyatlarını güncellemek için yardımcı fonksiyon
async function updateFilamentPrices(customerId: string, filamentPrices: { type: string; price: number }[]) {
  try {
    console.log("Filament fiyatlarını güncelleme:", customerId, filamentPrices);
    
    // Müşterinin var olduğunu kontrol et
    const customerResult = await query(`
      SELECT * FROM customers WHERE id = $1
    `, [customerId]);
    
    if (customerResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }
    
    // Mevcut filament fiyatlarını sil
    await query(`
      DELETE FROM customer_filament_prices
      WHERE customer_id = $1
    `, [customerId]);
    
    // Yeni filament fiyatlarını ekle
    if (Array.isArray(filamentPrices) && filamentPrices.length > 0) {
      for (const filamentPrice of filamentPrices) {
        await query(`
          INSERT INTO customer_filament_prices (
            customer_id, filament_type, price_per_gram
          )
          VALUES ($1, $2, $3)
        `, [
          customerId, 
          filamentPrice.type || 'PLA',
          parseFloat(filamentPrice.price) || 0
        ]);
      }
    } else {
      // Varsayılan bir fiyat ekle
      await query(`
        INSERT INTO customer_filament_prices (
          customer_id, filament_type, price_per_gram
        )
        VALUES ($1, $2, $3)
      `, [customerId, 'PLA', 0]);
    }
    
    // Müşteriyi ve filament fiyatlarını getir
    const customerData = customerResult.rows[0];
    
    const filamentPricesResult = await query(`
      SELECT filament_type, price_per_gram 
      FROM customer_filament_prices
      WHERE customer_id = $1
    `, [customerId]);
    
    const savedFilamentPrices = filamentPricesResult.rows.map(row => ({
      type: row.filament_type,
      price: row.price_per_gram
    }));
    
    // Müşteri siparişleri hakkında ek bilgi al
    try {
      const statsResult = await query(`
        SELECT 
          COALESCE((SELECT COUNT(*) FROM orders WHERE customer_id = $1), 0) as order_count,
          COALESCE((SELECT SUM(total_amount) FROM orders WHERE customer_id = $1), 0) as total_spent,
          (SELECT MAX(order_date) FROM orders WHERE customer_id = $1) as last_order_date
      `, [customerId]);
      
      // Snake case'i camelCase'e dönüştür
      const { 
        customer_code, 
        customer_type, 
        tax_number,
        created_at, 
        updated_at
      } = customerData;
      
      const { order_count, total_spent: apiTotalSpent, last_order_date } = statsResult.rows[0];
      
      const formattedCustomer = {
        ...customerData,
        customerCode: customer_code || '',
        type: customer_type || 'Bireysel',
        taxNumber: tax_number || '',
        orderCount: parseInt(order_count) || 0,
        totalSpent: parseFloat(apiTotalSpent) || 0,
        lastOrderDate: last_order_date ? new Date(last_order_date).toLocaleDateString('tr-TR') : '-',
        filamentPrices: savedFilamentPrices,
        createdAt: created_at,
        updatedAt: updated_at
      };
      
      return NextResponse.json(formattedCustomer);
    } catch (statsError) {
      console.error('Filament fiyatları için istatistikler getirilirken hata:', statsError);
      
      // Basit bir yanıt döndür
      const { 
        customer_code, 
        customer_type, 
        tax_number,
        created_at, 
        updated_at
      } = customerData;
      
      const formattedCustomer = {
        ...customerData,
        customerCode: customer_code || '',
        type: customer_type || 'Bireysel',
        taxNumber: tax_number || '',
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: '-',
        filamentPrices: savedFilamentPrices,
        createdAt: created_at,
        updatedAt: updated_at
      };
      
      return NextResponse.json(formattedCustomer);
    }
  } catch (error) {
    console.error('Filament fiyatları güncelleme hatası:', error);
    return NextResponse.json(
      { error: `Filament fiyatları güncellenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    );
  }
}

// Müşteri sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Müşteri ID gerekli' },
        { status: 400 }
      );
    }
    
    // Önce bu müşteriye ait siparişleri kontrol et
    const orderResult = await query(`
      SELECT COUNT(*) FROM orders WHERE customer_id = $1
    `, [id]);
    
    const orderCount = parseInt(orderResult.rows[0].count);
    
    if (orderCount > 0) {
      return NextResponse.json(
        { error: `Bu müşteriye ait ${orderCount} sipariş bulunmaktadır. Siparişleri önce silmelisiniz.` },
        { status: 400 }
      );
    }
    
    // Önce müşteriye ait filament fiyatlarını sil
    await query(`
      DELETE FROM customer_filament_prices
      WHERE customer_id = $1
    `, [id]);
    
    // Müşteriyi sil
    const result = await query(`
      DELETE FROM customers
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Müşteri başarıyla silindi',
      deletedId: id
    });
  } catch (error) {
    console.error('Müşteri silme hatası:', error);
    return NextResponse.json(
      { error: 'Müşteri silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 