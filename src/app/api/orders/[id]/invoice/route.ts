import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    // Sipariş detaylarını getir
    const orderResult = await query(`
      SELECT 
        o.id,
        o.order_code,
        COALESCE(c.name, 'Pazaryeri Müşterisi') as customer_name,
        COALESCE(c.phone, '') as customer_phone,
        COALESCE(c.address, '') as customer_address,
        COALESCE(c.email, '') as customer_email,
        o.order_date,
        o.total_amount,
        o.status,
        o.notes
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.order_code = $1
    `, [orderId]);

    if (orderResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // Sipariş ürünlerini getir
    const itemsResult = await query(`
      SELECT 
        CASE 
          WHEN oi.product_code IS NOT NULL AND oi.product_code != '' THEN oi.product_code
          WHEN p.product_code IS NOT NULL THEN p.product_code
          ELSE 'SİLİNMİŞ-' || oi.id
        END as product_code,
        CASE 
          WHEN oi.product_name IS NOT NULL AND oi.product_name != '' THEN oi.product_name
          WHEN p.product_type IS NOT NULL THEN p.product_type
          ELSE 'Ürün Bilgisi Bulunamadı'
        END as product_name,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price) as total_price,
        CASE 
          WHEN p.capacity IS NOT NULL THEN p.capacity
          ELSE 5  -- Varsayılan ağırlık 5gr
        END as capacity,
        CASE 
          WHEN p.piece_gram IS NOT NULL AND p.piece_gram > 0 THEN p.piece_gram
          ELSE 1 -- Varsayılan ağırlık 1gr (eğer ürünün gramajı tanımlı değilse)
        END as piece_gram,
        -- Ürün toplam ağırlığını hesapla (adet * birim gramaj)
        (CASE 
          WHEN p.piece_gram IS NOT NULL AND p.piece_gram > 0 THEN p.piece_gram
          ELSE 1 -- Varsayılan ağırlık 1gr
        END * oi.quantity) as total_weight
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
    `, [order.id]);

    // Müşteri bakiyesini getir (varsa)
    let customerBalance = 0;
    if (order.customer_name !== 'Pazaryeri Müşterisi') {
      const balanceResult = await query(`
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN islem_turu = 'Borç' THEN tutar 
              WHEN islem_turu = 'Alacak' THEN -tutar 
              ELSE 0 
            END
          ), 0) as balance
        FROM cari_hesap ch
        JOIN customers c ON c.id = ch.musteri_id
        WHERE c.name = $1
      `, [order.customer_name]);
      
      customerBalance = parseFloat(balanceResult.rows[0]?.balance || 0);
    }

    // Fatura verilerini hazırla
    const invoiceData = {
      order: {
        ...order,
        order_date: new Date(order.order_date).toLocaleDateString('tr-TR'),
        total_amount: parseFloat(order.total_amount)
      },
      items: itemsResult.rows.map(item => ({
        ...item,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        piece_gram: parseFloat(item.piece_gram || 0),
        total_weight: parseFloat(item.total_weight || 0)
      })),
      customerBalance,
      companyInfo: {
        name: 'ULUDAĞ 3D',
        address: 'Bursa/Türkiye',
        phone: '+90 XXX XXX XX XX',
        email: 'info@uludag3d.com',
        website: 'www.uludag3d.com'
      },
      bankInfo: {
        bankName: 'Ziraat Bankası',
        accountName: 'ULUDAĞ 3D',
        iban: 'TR XX XXXX XXXX XXXX XXXX XXXX XX',
        accountNo: 'XXXXXXXX'
      }
    };

    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error('Fatura verileri alınırken hata:', error);
    return NextResponse.json(
      { error: 'Fatura verileri alınamadı' },
      { status: 500 }
    );
  }
} 