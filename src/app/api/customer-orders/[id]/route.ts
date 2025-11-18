import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Geçersiz müşteri ID' },
        { status: 400 }
      );
    }

    const queryText = `
      SELECT 
        o.id,
        o.order_code,
        o.order_date,
        o.total_amount,
        o.status,
        o.notes,
        json_agg(
          json_build_object(
            'code', p.product_code,
            'name', p.product_type,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price
          )
        ) as products
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.customer_id = $1
      GROUP BY o.id, o.order_code, o.order_date, o.total_amount, o.status, o.notes
      ORDER BY o.order_date DESC
      LIMIT $2
    `;

    const result = await dbQuery(queryText, [customerId, limit]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Customer orders error:', error);
    return NextResponse.json(
      { error: 'Müşteri siparişleri alınırken hata oluştu' },
      { status: 500 }
    );
  }
} 