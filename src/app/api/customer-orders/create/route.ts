import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { notifyOrderCreated } from '@/lib/notifications';

interface OrderItem {
  productId: number;
  quantity: number;
}

interface CreateOrderBody {
  items: OrderItem[];
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Yetkilendirme hatası' },
        { status: auth.status || 401 }
      );
    }

    if (auth.user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Bu işlem sadece müşteriler için geçerlidir' },
        { status: 403 }
      );
    }

    const customerId = auth.user.customerId;
    if (!customerId) {
      return NextResponse.json(
        { error: 'Müşteri bilgisi bulunamadı' },
        { status: 400 }
      );
    }

    const body: CreateOrderBody = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'En az bir ürün eklemelisiniz' },
        { status: 400 }
      );
    }

    const productIds = body.items.map(item => item.productId);
    const productsResult = await query(
      `SELECT id, product_code, product_type, piece_gram FROM products WHERE id = ANY($1)`,
      [productIds]
    );

    if (productsResult.rows.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Bazı ürünler bulunamadı' },
        { status: 404 }
      );
    }

    const productMap = new Map(productsResult.rows.map((p: { id: number }) => [p.id, p]));

    let totalAmount = 0;
    for (const item of body.items) {
      const product = productMap.get(item.productId) as { piece_gram: number } | undefined;
      if (product) {
        totalAmount += product.piece_gram * item.quantity;
      }
    }

    const orderCode = `SIP-${Date.now()}`;
    const orderResult = await query(
      `INSERT INTO orders (order_code, customer_id, order_date, total_amount, status, payment_status, notes)
       VALUES ($1, $2, CURRENT_DATE, $3, 'Beklemede', 'Ödenmedi', $4)
       RETURNING *`,
      [orderCode, customerId, totalAmount, body.notes || null]
    );

    const order = orderResult.rows[0];

    for (const item of body.items) {
      const product = productMap.get(item.productId) as {
        product_code: string;
        product_type: string;
        piece_gram: number;
      };
      await query(
        `INSERT INTO order_items (order_id, product_id, product_code, product_name, quantity, unit_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'onay_bekliyor')`,
        [order.id, item.productId, product.product_code, product.product_type, item.quantity, product.piece_gram]
      );
    }

    const customerResult = await query(
      `SELECT name, email FROM customers WHERE id = $1`,
      [customerId]
    );
    const customer = customerResult.rows[0];

    if (customer?.email) {
      notifyOrderCreated(
        orderCode,
        customer.name,
        customer.email,
        totalAmount,
        body.items.length
      ).catch(() => {});
    }

    return NextResponse.json({
      message: 'Sipariş başarıyla oluşturuldu',
      order: { ...order, itemCount: body.items.length },
    }, { status: 201 });
  } catch (error) {
    console.error('Customer order create error:', error);
    return NextResponse.json(
      { error: 'Sipariş oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}
