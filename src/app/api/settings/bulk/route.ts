import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { verifyAuth } from '../../../../lib/auth-middleware';
import { getClientIP, logSecurityEvent } from '../../../../lib/security';

// Toplu ayar güncelle (sadece admin)
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // Admin kontrolü
    const auth = verifyAuth(request);
    if (!auth.authenticated || auth.user?.role !== 'admin') {
      console.log('Settings bulk update - auth failed:', auth);
      return NextResponse.json(
        { error: 'Yetkisiz erişim', details: 'Admin girişi gerekli' },
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
        { error: 'Ayarlar tablosu bulunamadı', details: 'Lütfen veritabanı kurulumunu tamamlayın.' },
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
    
    // Ayar tipi belirleme fonksiyonu
    const getSettingType = (key: string, value: any): string => {
      if (key === 'hidden_categories') return 'json';
      if (key === 'maintenance_mode' || key === 'order_notifications_enabled') return 'boolean';
      if (key === 'min_order_amount' || key === 'free_shipping_limit' || key === 'low_stock_threshold') return 'number';
      if (typeof value === 'boolean') return 'boolean';
      if (typeof value === 'number') return 'number';
      if (Array.isArray(value) || typeof value === 'object') return 'json';
      return 'string';
    };
    
    // Kategori belirleme
    const getCategory = (key: string): string => {
      if (key === 'hidden_categories') return 'categories';
      if (key.includes('maintenance')) return 'general';
      if (key.includes('order') || key.includes('shipping')) return 'orders';
      if (key.includes('notification') || key.includes('stock')) return 'notifications';
      return 'general';
    };
    
    // Her ayarı güncelle veya ekle (UPSERT)
    for (const [key, value] of Object.entries(settings)) {
      const existing = await query(
        'SELECT id, setting_type FROM system_settings WHERE setting_key = $1',
        [key]
      );
      
      let jsonValue: any;
      let settingType: string;
      
      if (existing.rows.length === 0) {
        // Yeni ayar ekle
        settingType = getSettingType(key, value);
        
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
          `INSERT INTO system_settings (setting_key, setting_value, setting_type, category, is_public)
           VALUES ($1, $2::jsonb, $3, $4, true)`,
          [key, JSON.stringify(jsonValue), settingType, getCategory(key)]
        );
      } else {
        // Mevcut ayarı güncelle
        settingType = existing.rows[0].setting_type;
        
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
      }
      
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
