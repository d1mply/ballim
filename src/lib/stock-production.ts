// Stok üretim emri oluşturma - Stok Yönetimi sayfasının ortak helper'ı
// ortak kullandığı tek kaynak (duplicate POST mantığı kaldırıldı).

export interface CreateStockOrderInput {
  productId: number | string;
  quantity: number;
  notes?: string;
}

export interface CreateStockOrderResult {
  order?: { order_code?: string };
  [key: string]: unknown;
}

export async function createStockProductionOrder(
  input: CreateStockOrderInput
): Promise<CreateStockOrderResult> {
  // Sistem müşterisinin var olduğundan emin ol
  await fetch('/api/customers/system');

  const productId =
    typeof input.productId === 'string'
      ? parseInt(input.productId, 10)
      : input.productId;

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: null,
      customerName: 'STOK',
      products: [{ productId, quantity: input.quantity, unitPrice: 0 }],
      orderType: 'stock_production',
      notes: input.notes || 'Stok üretim emri',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.details || errorData.error || 'Üretim emri oluşturulamadı'
    );
  }

  return response.json();
}
