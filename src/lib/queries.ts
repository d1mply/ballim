// Database query optimizasyonu - Clean Code için merkezi query fonksiyonları

import { query } from './db';

// Filament queries
export const filamentQueries = {
  // Tüm filamentleri getir
  getAll: async () => {
    return await query(`
      SELECT 
        id,
        filament_code,
        name,
        type,
        brand,
        color,
        location,
        total_weight,
        remaining_weight,
        quantity,
        critical_stock,
        temp_range,
        cap,
        price_per_gram,
        created_at,
        updated_at
      FROM filaments
      WHERE remaining_weight > 0
      ORDER BY type, color, filament_code
    `);
  },

  // Tip ve renge göre filamentleri getir
  getByTypeAndColor: async (type: string, color: string) => {
    return await query(`
      SELECT 
        id,
        filament_code,
        remaining_weight,
        total_weight
      FROM filaments 
      WHERE type = $1 AND color = $2 AND remaining_weight > 0
      ORDER BY remaining_weight DESC
    `, [type, color]);
  },

  // Filament stok güncelle
  updateWeight: async (id: number, newWeight: number) => {
    return await query(`
      UPDATE filaments 
      SET remaining_weight = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, filament_code, remaining_weight
    `, [newWeight, id]);
  }
};

// Order queries
export const orderQueries = {
  // Sipariş detaylarını getir
  getById: async (orderCode: string) => {
    return await query(`
      SELECT id FROM orders WHERE order_code = $1 LIMIT 1
    `, [orderCode]);
  },

  // Üretim için siparişleri getir
  getForProduction: async () => {
    return await query(`
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
                SELECT COALESCE(SUM(quantity), 0)
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
  }
};

// Product queries
export const productQueries = {
  // Ürün filament bilgilerini getir
  getFilaments: async (productId: string) => {
    return await query(`
      SELECT 
        pf.filament_type,
        pf.filament_color,
        pf.weight,
        pf.filament_density as brand
      FROM product_filaments pf
      WHERE pf.product_id = $1
    `, [productId]);
  },

  // Ürün stok durumunu getir
  getStockStatus: async (productId: string) => {
    return await query(`
      SELECT 
        COALESCE(quantity, 0) as available_stock,
        (
          SELECT COALESCE(SUM(quantity), 0)
          FROM order_items
          WHERE product_id = $1
          AND status IN ('onay_bekliyor', 'uretiliyor', 'uretildi', 'hazirlaniyor')
        ) as reserved_stock
      FROM inventory 
      WHERE product_id = $1
    `, [productId]);
  }
};

// Inventory queries
export const inventoryQueries = {
  // Stok güncelle
  updateStock: async (productId: string, quantityChange: number) => {
    return await query(`
      INSERT INTO inventory (product_id, quantity, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (product_id) 
      DO UPDATE SET 
        quantity = inventory.quantity + $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING quantity
    `, [productId, quantityChange]);
  },

  // Stok kontrolü
  checkStock: async (productId: string) => {
    return await query(`
      SELECT COALESCE(quantity, 0) as current_stock
      FROM inventory 
      WHERE product_id = $1
    `, [productId]);
  }
};

// Filament usage queries
export const filamentUsageQueries = {
  // Filament kullanım kaydet
  logUsage: async (filamentId: number, productId: string, orderId: string, amount: number, description: string) => {
    return await query(`
      INSERT INTO filament_usage (
        filament_id, product_id, order_id, usage_date, amount, description
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
    `, [filamentId, productId, orderId, amount, description]);
  }
};
