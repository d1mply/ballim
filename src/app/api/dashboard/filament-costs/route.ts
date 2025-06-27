import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, week, year
    
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND fp.purchase_date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND fp.purchase_date >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND fp.purchase_date >= CURRENT_DATE - INTERVAL '365 days'";
        break;
      default:
        dateFilter = "AND fp.purchase_date >= CURRENT_DATE - INTERVAL '30 days'";
    }
    
    // Bu dönemdeki toplam filament alım maliyeti
    const totalCostResult = await query(`
      SELECT 
        COALESCE(SUM(fp.purchase_price), 0) as total_cost,
        COALESCE(SUM(fp.amount_gram), 0) as total_amount,
        COUNT(*) as purchase_count
      FROM filament_purchases fp
      WHERE 1=1 ${dateFilter}
    `);
    
    // Filament türü bazında maliyet analizi
    const costByTypeResult = await query(`
      SELECT 
        f.type,
        f.color,
        SUM(fp.purchase_price) as total_cost,
        SUM(fp.amount_gram) as total_amount,
        AVG(fp.price_per_gram) as avg_price_per_gram,
        COUNT(*) as purchase_count
      FROM filament_purchases fp
      JOIN filaments f ON fp.filament_id = f.id
      WHERE 1=1 ${dateFilter}
      GROUP BY f.type, f.color
      ORDER BY total_cost DESC
    `);
    
    // En pahalı ve en ucuz filamentler
    const priceRangeResult = await query(`
      SELECT 
        f.type,
        f.color,
        f.brand,
        MAX(fp.price_per_gram) as max_price_per_gram,
        MIN(fp.price_per_gram) as min_price_per_gram,
        AVG(fp.price_per_gram) as avg_price_per_gram
      FROM filament_purchases fp
      JOIN filaments f ON fp.filament_id = f.id
      WHERE 1=1 ${dateFilter}
      GROUP BY f.type, f.color, f.brand
      ORDER BY avg_price_per_gram DESC
    `);
    
    // Son alımlar
    const recentPurchasesResult = await query(`
      SELECT 
        fp.*,
        f.type,
        f.color,
        f.brand,
        f.filament_code
      FROM filament_purchases fp
      JOIN filaments f ON fp.filament_id = f.id
      WHERE 1=1 ${dateFilter}
      ORDER BY fp.purchase_date DESC
      LIMIT 10
    `);
    
    // Günlük ortalama maliyet
    const dailyAverageResult = await query(`
      SELECT 
        AVG(daily_cost) as avg_daily_cost
      FROM (
        SELECT 
          fp.purchase_date,
          SUM(fp.purchase_price) as daily_cost
        FROM filament_purchases fp
        WHERE 1=1 ${dateFilter}
        GROUP BY fp.purchase_date
      ) daily_costs
    `);
    
    const totalCost = parseFloat(totalCostResult.rows[0]?.total_cost || 0);
    const totalAmount = parseFloat(totalCostResult.rows[0]?.total_amount || 0);
    const purchaseCount = parseInt(totalCostResult.rows[0]?.purchase_count || 0);
    const avgPricePerGram = totalAmount > 0 ? totalCost / totalAmount : 0;
    const avgDailyCost = parseFloat(dailyAverageResult.rows[0]?.avg_daily_cost || 0);
    
    const response = {
      period,
      summary: {
        totalCost: totalCost,
        totalAmount: totalAmount,
        purchaseCount: purchaseCount,
        avgPricePerGram: avgPricePerGram,
        avgDailyCost: avgDailyCost
      },
      costByType: costByTypeResult.rows.map(row => ({
        type: row.type,
        color: row.color,
        totalCost: parseFloat(row.total_cost),
        totalAmount: parseFloat(row.total_amount),
        avgPricePerGram: parseFloat(row.avg_price_per_gram),
        purchaseCount: parseInt(row.purchase_count)
      })),
      priceRange: priceRangeResult.rows.map(row => ({
        type: row.type,
        color: row.color,
        brand: row.brand,
        maxPricePerGram: parseFloat(row.max_price_per_gram),
        minPricePerGram: parseFloat(row.min_price_per_gram),
        avgPricePerGram: parseFloat(row.avg_price_per_gram)
      })),
      recentPurchases: recentPurchasesResult.rows.map(row => ({
        id: row.id,
        filamentCode: row.filament_code,
        type: row.type,
        color: row.color,
        brand: row.brand,
        amount: parseFloat(row.amount_gram),
        price: parseFloat(row.purchase_price),
        pricePerGram: parseFloat(row.price_per_gram),
        supplier: row.supplier,
        purchaseDate: row.purchase_date,
        notes: row.notes
      }))
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Filament maliyet analizi hatası:', error);
    return NextResponse.json(
      { error: 'Maliyet analizi getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 