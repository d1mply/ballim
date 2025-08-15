import { NextRequest, NextResponse } from 'next/server';
import { calculateOrderItemPrice, getWholesalePriceDetails } from '../../../lib/pricing';

// Fiyat hesaplama endpoint'i (ön görüntüleme için)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, productId, quantity, filamentType } = body;

    if (!productId || !quantity) {
      return NextResponse.json(
        { error: 'Ürün ID ve miktar gerekli' },
        { status: 400 }
      );
    }

    if (!customerId) {
      // Pazaryeri müşterisi
      return NextResponse.json({
        unitPrice: 0.01,
        totalPrice: 0.01,
        customerType: 'marketplace',
        message: 'Pazaryeri siparişi - minimal fiyat'
      });
    }

    try {
      // Ana fiyat hesaplama
      const unitPrice = await calculateOrderItemPrice(
        customerId,
        productId,
        quantity,
        filamentType
      );

      const totalPrice = unitPrice;

      // Müşteri kategorisini kontrol et
      const { query } = await import('../../../lib/db');
      const customerResult = await query(`
        SELECT customer_category, discount_rate
        FROM customers
        WHERE id = $1
      `, [customerId]);

      if (customerResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Müşteri bulunamadı' },
          { status: 404 }
        );
      }

      const customer = customerResult.rows[0];
      const isWholesale = customer.customer_category === 'wholesale';

      let priceDetails = {
        unitPrice,
        totalPrice,
        customerType: isWholesale ? 'wholesale' : 'normal'
      };

      // Toptancı için detaylı bilgi
      if (isWholesale) {
        try {
          const wholesaleDetails = await getWholesalePriceDetails(
            customerId,
            productId,
            quantity
          );
          
          priceDetails = {
            ...priceDetails,
            ...wholesaleDetails,
            message: `${wholesaleDetails.priceRange} aralığında, %${wholesaleDetails.discountRate} iskonto uygulandı`
          };
        } catch (detailError) {
          console.error('Toptancı detay bilgisi alınamadı:', detailError);
        }
      } else {
        // Normal müşteri için filament bilgisi
        priceDetails = {
          ...priceDetails,
          filamentType,
          message: `${filamentType} filament için özel fiyat uygulandı`
        };
      }

      return NextResponse.json(priceDetails);

    } catch (pricingError) {
      console.error('Fiyat hesaplama hatası:', pricingError);
      return NextResponse.json(
        { error: `Fiyat hesaplanamadı: ${pricingError.message}` },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Fiyat hesaplama API hatası:', error);
    return NextResponse.json(
      { error: 'Fiyat hesaplanırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
