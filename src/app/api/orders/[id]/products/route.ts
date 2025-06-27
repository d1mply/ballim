import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Sipariş ID'sini al
    const orderId = params.id;

    // Sipariş ürünlerini getir
    const orderProducts = await db.query(
      `SELECT 
        op.product_id,
        p.code,
        p.name,
        op.quantity
      FROM order_products op
      JOIN products p ON p.id = op.product_id
      WHERE op.order_id = $1`,
      [orderId]
    );

    return NextResponse.json(orderProducts.rows);
  } catch (error) {
    console.error('Sipariş ürünleri getirilirken hata:', error);
    return NextResponse.json(
      { error: 'Sipariş ürünleri getirilemedi' },
      { status: 500 }
    );
  }
} 