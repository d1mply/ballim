import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { verifyAuth } from '../../../lib/auth-middleware';
import { getClientIP, logSecurityEvent } from '../../../lib/security';

// Ayarları getir
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const allSettings = url.searchParams.get('all') === 'true';
    
    // Tüm ayarlar isteniyorsa admin kontrolü yap
    if (allSettings) {
      const auth = verifyAuth(request);
      if (!auth.authenticated || auth.user?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Yetkisiz erişim' },
          { status: 403 }
        );
      }
    }
    
    // Tablo var mı kontrol et
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      ) as table_exists;
    `);
    
    if (!tableCheck.rows[0].table_exists) {
      // Tablo yoksa varsayılan ayarları döndür
      console.warn('system_settings tablosu bulunamadı, varsayılan ayarlar kullanılıyor');
      return NextResponse.json({
        hidden_categories: [],
        maintenance_mode: false,
        maintenance_message: 'Sistem bakımda',
        min_order_amount: 0,
        free_shipping_limit: 500,
        order_notifications_enabled: true,
        low_stock_threshold: 5
      });
    }
    
    // Ayarları getir (public olanlar veya tümü)
    const result = await query(`
      SELECT 
        setting_key,
        setting_value,
        setting_type,
        category,
        description,
        is_public
      FROM system_settings
      ${allSettings ? '' : 'WHERE is_public = true'}
      ORDER BY category, setting_key
    `);
    
    // Key-value formatına dönüştür
    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      // JSONB değerini parse et
      let value = row.setting_value;
      
      // Tip dönüşümü yap
      switch (row.setting_type) {
        case 'boolean':
          value = value === true || value === 'true';
          break;
        case 'number':
          value = Number(value);
          break;
        case 'json':
          // JSONB zaten parse edilmiş olabilir
          if (typeof value === 'string') {
            try { value = JSON.parse(value); } catch { /* ignore */ }
          }
          break;
        // string: olduğu gibi bırak
      }
      
      settings[row.setting_key] = value;
    }
    
    // Admin için metadata da gönder
    if (allSettings) {
      const settingsWithMeta = result.rows.map(row => ({
        key: row.setting_key,
        value: row.setting_value,
        type: row.setting_type,
        category: row.category,
        description: row.description,
        isPublic: row.is_public
      }));
      
      return NextResponse.json({
        settings,
        metadata: settingsWithMeta
      });
    }
    
    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Ayarlar getirme hatası:', error);
    return NextResponse.json(
      { error: 'Ayarlar yüklenemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

// Ayar güncelle (sadece admin)
export async function PUT(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // Admin kontrolü
    const auth = verifyAuth(request);
    if (!auth.authenticated || auth.user?.role !== 'admin') {
      logSecurityEvent('SETTINGS_UPDATE_UNAUTHORIZED', {
        ip: clientIP,
        userId: String(auth.user?.id || 'unknown'),
      }, 'HIGH');
      
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 403 }
      );
    }
    
    // Tablo var mı kontrol et
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      ) as table_exists;
    `);
    
    if (!tableCheck.rows[0].table_exists) {
      return NextResponse.json(
        { error: 'Ayarlar tablosu bulunamadı. Lütfen veritabanı kurulumunu tamamlayın.' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { key, value } = body;
    
    if (!key) {
      return NextResponse.json(
        { error: 'Ayar anahtarı gerekli' },
        { status: 400 }
      );
    }
    
    // Ayarın var olduğunu kontrol et
    const existing = await query(
      'SELECT id, setting_type FROM system_settings WHERE setting_key = $1',
      [key]
    );
    
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ayar bulunamadı' },
        { status: 404 }
      );
    }
    
    // Değeri JSONB formatına çevir
    let jsonValue: any;
    const settingType = existing.rows[0].setting_type;
    
    switch (settingType) {
      case 'boolean':
        jsonValue = value === true || value === 'true';
        break;
      case 'number':
        jsonValue = Number(value);
        if (isNaN(jsonValue)) {
          return NextResponse.json(
            { error: 'Geçersiz sayı değeri' },
            { status: 400 }
          );
        }
        break;
      case 'json':
        jsonValue = value;
        break;
      case 'string':
      default:
        jsonValue = String(value);
    }
    
    // Ayarı güncelle
    await query(
      `UPDATE system_settings 
       SET setting_value = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
       WHERE setting_key = $2`,
      [JSON.stringify(jsonValue), key]
    );
    
    logSecurityEvent('SETTINGS_UPDATED', {
      ip: clientIP,
      userId: String(auth.user?.id),
      key,
      newValue: String(jsonValue),
    }, 'LOW');
    
    return NextResponse.json({
      success: true,
      message: 'Ayar güncellendi',
      key,
      value: jsonValue
    });
  } catch (error) {
    console.error('Ayar güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Ayar güncellenemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}

// Toplu ayar güncelle (sadece admin)
export async function PATCH(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // Admin kontrolü
    const auth = verifyAuth(request);
    if (!auth.authenticated || auth.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 403 }
      );
    }
    
    // Tablo var mı kontrol et
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      ) as table_exists;
    `);
    
    if (!tableCheck.rows[0].table_exists) {
      return NextResponse.json(
        { error: 'Ayarlar tablosu bulunamadı. Lütfen veritabanı kurulumunu tamamlayın.' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { settings } = body;
    
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Ayarlar objesi gerekli' },
        { status: 400 }
      );
    }
    
    const updatedKeys: string[] = [];
    
    // Her ayarı güncelle
    for (const [key, value] of Object.entries(settings)) {
      const existing = await query(
        'SELECT id, setting_type FROM system_settings WHERE setting_key = $1',
        [key]
      );
      
      if (existing.rows.length === 0) continue;
      
      let jsonValue: any;
      const settingType = existing.rows[0].setting_type;
      
      switch (settingType) {
        case 'boolean':
          jsonValue = value === true || value === 'true';
          break;
        case 'number':
          jsonValue = Number(value);
          break;
        case 'json':
          jsonValue = value;
          break;
        default:
          jsonValue = String(value);
      }
      
      await query(
        `UPDATE system_settings 
         SET setting_value = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
         WHERE setting_key = $2`,
        [JSON.stringify(jsonValue), key]
      );
      
      updatedKeys.push(key);
    }
    
    logSecurityEvent('SETTINGS_BULK_UPDATE', {
      ip: clientIP,
      userId: String(auth.user?.id),
      keys: updatedKeys.join(', '),
    }, 'LOW');
    
    return NextResponse.json({
      success: true,
      message: `${updatedKeys.length} ayar güncellendi`,
      updatedKeys
    });
  } catch (error) {
    console.error('Toplu ayar güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Ayarlar güncellenemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' },
      { status: 500 }
    );
  }
}
