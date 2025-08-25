# 🎯 Filament Bobin Seçim Sistemi - Ballim

## 📋 Genel Bakış

Bu güncelleme ile üretim takip sisteminde **"Üretime Al"** butonuna basıldığında, filament bilgisi olan ürünler için **filament bobin seçim modalı** açılacak. Bu modal, kullanıcının hangi filament bobinlerini kullanacağını seçmesini sağlar.

## 🔄 Sistem Akışı

### 1. Eski Sistem (Güncellenmedi)
```
Üretime Al → Üretim Modalı → Üretim Başlat
```

### 2. Yeni Sistem (Güncellendi)
```
Üretime Al → Filament Bobin Seçim Modalı → Üretim Modalı → Üretim Başlat
```

## 🆕 Yeni Özellikler

### 📱 Filament Bobin Seçim Modalı
- **Otomatik Açılış**: Filament bilgisi olan ürünler için otomatik açılır
- **Bobin Filtreleme**: Sadece yeterli miktarda filament olan bobinler gösterilir
- **Akıllı Seçim**: En çok miktarda olan bobin varsayılan olarak seçilir
- **Görsel Gösterim**: Her filament rengi için renkli gösterim
- **Stok Kontrolü**: Yetersiz stok uyarıları

### 🎨 Modal Tasarımı
- **Responsive**: Mobil ve masaüstü uyumlu
- **Renk Kodları**: Filament renkleri için hex kodları
- **Durum Göstergeleri**: ✅ Yeterli stok, ❌ Yetersiz stok
- **Seçim Özeti**: Seçilen bobinlerin özeti

## 🛠️ Teknik Detaylar

### 📁 Yeni Dosyalar
- `src/components/FilamentSelectionModal.tsx` - Ana modal bileşeni
- `src/app/api/products/[id]/route.ts` - Ürün detay API'si

### 🔧 Güncellenen Dosyalar
- `src/app/uretim-takip/page.tsx` - Üretim takip sayfası
- `src/app/uretim-takip/page.tsx` - Modal entegrasyonu

### 🗃️ Veritabanı Yapısı
```sql
-- Ürün filamentleri tablosu
product_filaments:
- id: Filament ID
- product_id: Ürün ID
- filament_type: Filament türü (PLA, ABS, vb.)
- filament_color: Filament rengi (Siyah, Kırmızı, vb.)
- filament_density: Marka/bilgi
- weight: Gerekli miktar (gram)

-- Filament bobinleri tablosu
filaments:
- id: Bobin ID
- filament_code: Bobin kodu (PLA-SIY-001)
- type: Filament türü
- color: Filament rengi
- remaining_weight: Kalan miktar
- total_weight: Toplam miktar
```

## 🚀 Kullanım Senaryosu

### 📝 Örnek: Test Ürünü
**Ürün Bilgileri:**
- Ürün Kodu: TEST-001
- Filament 1: Siyah PLA (3000g gerekli)
- Filament 2: Kırmızı PLA (2000g gerekli)

**Mevcut Bobinler:**
- PLA SIY 001: 2500g kalan (❌ Yetersiz)
- PLA SIY 002: 4000g kalan (✅ Yeterli)
- PLA SIY 003: 1500g kalan (❌ Yetersiz)
- PLA KIR 001: 3000g kalan (✅ Yeterli)
- PLA KIR 002: 1800g kalan (❌ Yetersiz)

### 🔄 İşlem Adımları
1. **Üretime Al** butonuna basılır
2. **Filament Bobin Seçim Modalı** açılır
3. **Siyah PLA** için PLA SIY 002 seçilir
4. **Kırmızı PLA** için PLA KIR 001 seçilir
5. **Filament Seçimini Onayla** butonuna basılır
6. **Üretim Modalı** açılır (seçilen bobinler gösterilir)
7. **Üretimi Başlat** butonuna basılır

## ⚙️ Konfigürasyon

### 🎨 Renk Kodları
```typescript
const colorMap = {
  'Siyah': '#000000',
  'Beyaz': '#FFFFFF',
  'Kırmızı': '#FF0000',
  'Mavi': '#0000FF',
  'Yeşil': '#00FF00',
  'Sarı': '#FFFF00',
  'Turuncu': '#FFA500',
  'Mor': '#800080',
  'Pembe': '#FFC0CB',
  'Kahverengi': '#A52A2A',
  'Gri': '#808080',
  'Altın': '#FFD700',
  'Gümüş': '#C0C0C0'
};
```

### 🔒 Güvenlik Özellikleri
- **Stok Kontrolü**: Yetersiz miktarda bobin seçilemez
- **Validasyon**: Tüm filamentler için bobin seçimi zorunlu
- **Hata Yönetimi**: API hatalarında kullanıcı dostu mesajlar

## 📊 API Entegrasyonu

### 🔍 Filament Bobinleri Getir
```typescript
GET /api/filaments
Response: Filament bobin listesi
```

### 🔍 Ürün Detayları Getir
```typescript
GET /api/products/[id]
Response: Ürün + filament bilgileri
```

### 📤 Üretim Başlat
```typescript
PUT /api/orders/status
Body: {
  orderId: string,
  status: 'Üretimde',
  productionQuantity: number,
  selectedFilamentBobins: Array
}
```

## 🧪 Test Senaryoları

### ✅ Başarılı Senaryo
1. Filament bilgisi olan ürün
2. Yeterli stok mevcut
3. Bobin seçimi yapıldı
4. Üretim başlatıldı

### ⚠️ Uyarı Senaryosu
1. Filament bilgisi olan ürün
2. Bazı filamentlerde yetersiz stok
3. Uyarı mesajları gösterildi
4. Yeterli olanlar seçildi

### ❌ Hata Senaryosu
1. Filament bilgisi olan ürün
2. Hiçbir filamentde yeterli stok yok
3. Hata mesajı gösterildi
4. Üretim başlatılamadı

## 🔄 Geriye Dönük Uyumluluk

### ✅ Korunan Özellikler
- Mevcut üretim takip sistemi
- Üretim modalı
- Stok hesaplama
- Gramaj düşüm mantığı

### 🆕 Eklenen Özellikler
- Filament bobin seçimi
- Detaylı stok kontrolü
- Bobin bazında takip
- Görsel filament gösterimi

## 🎯 Gelecek Geliştirmeler

### 🔮 Planlanan Özellikler
- **Otomatik Bobin Seçimi**: En uygun bobinlerin otomatik seçimi
- **Bobin Öncelik Sistemi**: Bobin kullanım öncelikleri
- **Filament Maliyet Takibi**: Bobin bazında maliyet analizi
- **Bobin Kullanım Geçmişi**: Detaylı kullanım raporları

### 📈 Performans İyileştirmeleri
- **Cache Sistemi**: Filament verilerinin önbelleklenmesi
- **Lazy Loading**: Modal açıldığında veri yükleme
- **Optimized Queries**: Veritabanı sorgu optimizasyonu

## 🐛 Bilinen Sorunlar

### ⚠️ Mevcut Durum
- Filament bilgisi olmayan ürünler için modal açılmaz
- Bobin seçimi yapılmadan üretim başlatılamaz
- Yetersiz stok durumunda uyarı gösterilir

### 🔧 Çözüm Önerileri
- Filament bilgisi olmayan ürünler için bilgilendirme
- Stok yetersizliği durumunda alternatif öneriler
- Bobin seçimi için yardım metinleri

## 📞 Destek

### 🆘 Sorun Bildirimi
- GitHub Issues kullanın
- Detaylı hata açıklaması ekleyin
- Ekran görüntüleri ekleyin

### 💡 Öneriler
- Yeni özellik önerileri için GitHub Discussions
- UI/UX iyileştirme önerileri
- Performans optimizasyon önerileri

---

**Son Güncelleme**: Aralık 2024  
**Versiyon**: 1.0.0  
**Geliştirici**: Ballim Team
