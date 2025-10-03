import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

// Üretim için siparişleri getir - Basitleştirilmiş
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        o.id,
        o.order_code,
        o.customer_id,
        o.status,
        o.total_amount,
        o.order_date,
        CASE 
          WHEN o.customer_id IS NULL THEN 'STOK'
          ELSE COALESCE(c.name, 'Müşteri Bulunamadı')
        END as customer_name,
        COALESCE(o.notes, '') as notes,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_code', oi.product_code,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'status', COALESCE(oi.status, 'onay_bekliyor'),
              'capacity', (SELECT capacity FROM products WHERE id = oi.product_id),
              'availableStock', (SELECT COALESCE(quantity, 0) FROM inventory WHERE product_id = oi.product_id),
              'reservedStock', (
                SELECT CASE 
                  WHEN COALESCE(SUM(quantity), 0) <= COALESCE((SELECT quantity FROM inventory WHERE product_id = oi.product_id), 0)
                  THEN 0
                  ELSE COALESCE(SUM(quantity), 0) - COALESCE((SELECT quantity FROM inventory WHERE product_id = oi.product_id), 0)
                END
                FROM order_items
                WHERE product_id = oi.product_id
                AND status IN ('onay_bekliyor', 'uretiliyor', 'uretildi', 'hazirlaniyor')
              ),
              'filaments', (
                SELECT json_agg(
                  json_build_object(
                    'type', pf.filament_type,
                    'color', pf.filament_color,
                    'brand', pf.filament_density,
                    'weight', pf.weight
                  )
                )
                FROM product_filaments pf
                WHERE pf.product_id = oi.product_id
              )
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) as products
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('Onay Bekliyor', 'Üretimde', 'Üretildi', 'Hazırlanıyor', 'Hazırlandı')
      GROUP BY o.id, o.order_code, o.customer_id, o.status, o.total_amount, o.order_date, c.name, o.notes
      ORDER BY o.created_at DESC
      LIMIT 50
    `);

    console.log('📊 Üretim siparişleri:', result.rows.length, 'sipariş bulundu');
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Üretim siparişleri getirme hatası:', error);
    return NextResponse.json(
      { error: 'Üretim siparişleri getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}