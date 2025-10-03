# 📦 BALLIM STOK SİSTEMİ DOKÜMANTASYONU

## 🎯 STOK SİSTEMİ GENEL BAKIŞ

### **Stok Türleri**
1. **availableStock** - Satışa hazır fiziksel stok (inventory tablosu)
2. **reservedStock** - Siparişe ayrılmış stok (order_items tablosu)
3. **totalStock** - Toplam stok (available + reserved)

---

## 📊 VERİ AKIŞI DİYAGRAMI

### **1. MÜŞTERİ SİPARİŞ VERDİĞİNDE**
```
Müşteri → Sipariş Oluşturur
   ↓
orders tablosu: status = "Onay Bekliyor"
   ↓
order_items tablosu: status = "onay_bekliyor"
   ↓
REZERVE STOK ARTAR (getStockStatus() hesaplar)
   ↓
Stok Görünümü: "5 adet (3 rezerve)"
```

### **2. ADMİN STOK EKLEDİĞİNDE** (Stok Yönetimi Sayfası)
```
Admin → Stok Yönetimi → "Stok Üret" Butonu
   ↓
API: POST /api/inventory/add-stock
   ↓
inventory tablosu: quantity += X
   ↓
AVAİLABLE STOK ARTAR
   ↓
Stok Görünümü: "8 adet (3 rezerve)"
```

### **3. ADMİN STOK SİLDİĞİNDE** (Stok Yönetimi Sayfası)
```
Admin → Stok Yönetimi → "Stok Sil" Butonu
   ↓
API: POST /api/inventory/reduce-stock
   ↓
inventory tablosu: quantity -= X
   ↓
stock_reductions tablosu: Log kaydedilir
   ↓
AVAİLABLE STOK AZALIR
   ↓
Stok Görünümü: "3 adet (3 rezerve)"
```

### **4. ADMİN ÜRETİME ALDIĞINDA** (Üretim Takip Sayfası)
```
Admin → Üretim Takip → "Üretime Al" Butonu (Her ürün için)
   ↓
API: PUT /api/orders/product-status
   ↓
order_items tablosu: status = "uretiliyor"
   ↓
REZERVE STOK AYNI KALIR (hala rezerve)
   ↓
Stok Görünümü: "3 adet (3 rezerve)"
```

### **5. ADMİN ÜRETİMİ TAMAMLADIĞINDA** (Üretim Takip Sayfası)
```
Admin → Üretim Takip → "Üretimi Tamamla" Butonu
   ↓
API: PUT /api/orders/product-status
   ↓
order_items tablosu: status = "uretildi"
   ↓
REZERVE STOK AYNI KALIR
   ↓
Stok Görünümü: "3 adet (3 rezerve)"
```

### **6. ADMİN HAZIRLADIĞINDA** (Üretim Takip Sayfası)
```
Admin → Üretim Takip → "Hazırla" Butonu
   ↓
API: PUT /api/orders/product-status
   ↓
order_items tablosu: status = "hazirlaniyor"
   ↓
REZERVE STOK AYNI KALIR
   ↓
Stok Görünümü: "3 adet (3 rezerve)"
```

### **7. ADMİN SİPARİŞİ TAMAMLADIĞINDA** (Üretim Takip Sayfası)
```
Admin → Üretim Takip → "Hazırlandı" Butonu
   ↓
API: PUT /api/orders/product-status
   ↓
order_items tablosu: status = "hazirlandi"
   ↓
REZERVE STOK AZALIR (artık rezerve değil)
   ↓
Stok Görünümü: "3 adet"
```

### **8. SİPARİŞ İPTAL EDİLDİĞİNDE** (Sipariş Takip Sayfası)
```
Admin → Sipariş Takip → "Sil" Butonu
   ↓
API: DELETE /api/orders
   ↓
Eğer status = "hazirlandi" ise:
  inventory tablosu: quantity += sipariş miktarı
  (Stok geri eklenir)
   ↓
order_items tablosu: SİLİNİR
   ↓
REZERVE STOK AZALIR
   ↓
Stok Görünümü: "6 adet"
```

---

## 🗂️ VERİTABANI TABLOLARI

### **1. inventory** (Fiziksel Stok)
```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER UNIQUE REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **2. order_items** (Rezerve Stok)
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'onay_bekliyor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rezerve stok durumları:
-- 'onay_bekliyor' = Rezerve
-- 'uretiliyor' = Rezerve
-- 'uretildi' = Rezerve
-- 'hazirlaniyor' = Rezerve
-- 'hazirlandi' = REZERVE DEĞİL (teslim edildi)
```

### **3. stock_reductions** (Stok Düşme Logları)
```sql
CREATE TABLE stock_reductions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  notes TEXT,
  reduction_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📱 SAYFA YETKİLERİ

### **1. Stok Yönetimi** (Admin Only)
- ✅ Stok ekleme (Manuel)
- ✅ Stok silme (Fire, Kayıp, vb.)
- ✅ Stok görüntüleme (Available + Reserved)

### **2. Sipariş Takip** (Müşteri + Admin)
- ✅ **Müşteri**: Sadece kendi siparişlerini görür
- ✅ **Admin**: Tüm siparişleri görür ve yönetir
- ✅ Sipariş iptal etme (Admin)

### **3. Üretim Takip** (Admin Only)
- ✅ Ürün bazlı durum güncelleme
- ✅ Her ürün için ayrı butonlar:
  - Üretime Al
  - Üretimi Tamamla
  - Hazırla
  - Hazırlandı

---

## 🔧 API ENDPOINT'LERİ

### **Stok İşlemleri**
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/inventory/add-stock` | POST | Stok ekleme |
| `/api/inventory/reduce-stock` | POST | Stok silme |
| `/api/products` | GET | Ürün listesi + stok durumu |

### **Sipariş İşlemleri**
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/orders` | GET | Sipariş listesi |
| `/api/orders` | POST | Yeni sipariş |
| `/api/orders` | DELETE | Sipariş iptal |
| `/api/orders/status` | PUT | Sipariş durumu güncelleme |
| `/api/orders/product-status` | PUT | Ürün durumu güncelleme |

### **Üretim İşlemleri**
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/orders/production` | GET | Üretim için siparişler |

---

## 🎨 STOK GÖRÜNÜM FORMATLARI

### **Stok Renkleri**
```javascript
STOCK_COLORS = {
  IN_STOCK: 'text-green-600 bg-green-50',      // Stokta var
  LOW_STOCK: 'text-yellow-600 bg-yellow-50',   // Düşük stok
  OUT_OF_STOCK: 'text-red-600 bg-red-50',      // Stokta yok
  RESERVED: 'text-blue-600 bg-blue-50'         // Rezerve
}
```

### **Stok Gösterimi**
- **Stokta var**: `"15 adet"` (Yeşil)
- **Stokta var + Rezerve**: `"15 adet (5 rezerve)"` (Yeşil)
- **Sadece Rezerve**: `"0 adet (5 rezerve)"` (Mavi)
- **Stokta yok**: `"Stokta Yok"` (Kırmızı)

---

## 🔄 STOK HESAPLAMA FONKSİYONU

```typescript
// src/lib/stock.ts
export async function getStockStatus(productId: number): Promise<StockStatus> {
  // 1. Fiziksel stoğu al
  const availableStock = await query(
    `SELECT quantity FROM inventory WHERE product_id = $1`,
    [productId]
  );
  
  // 2. Rezerve stoğu hesapla
  const reservedStock = await query(
    `SELECT SUM(quantity) FROM order_items 
     WHERE product_id = $1 
     AND status IN ('onay_bekliyor', 'uretiliyor', 'uretildi', 'hazirlaniyor')`,
    [productId]
  );
  
  // 3. Toplam stok = available + reserved
  const totalStock = availableStock + reservedStock;
  
  // 4. Görünüm metni ve rengi belirle
  return {
    availableStock,
    reservedStock,
    totalStock,
    stockDisplay,
    stockColor
  };
}
```

---

## ⚠️ ÖNEMLİ NOTLAR

### **1. Rezerve Stok Mantığı**
- Sipariş verilince **otomatik rezerve** edilir
- Sadece **"hazirlandi"** durumunda rezerveden çıkar
- İptal edildiğinde stok geri eklenir

### **2. Stok Tutarlılığı**
- Tüm işlemler **transaction** içinde
- Hata durumunda **rollback**
- Veri kaybı olmaz

### **3. Kullanıcı İzolasyonu**
- Müşteriler sadece **kendi siparişlerini** görür
- Admin **tüm verilere** erişebilir
- Güvenlik kontrolleri **middleware** ile

---

## 🚀 KULLANIM SENARYOLARı

### **Senaryo 1: Yeni Sipariş**
1. Müşteri 10 adet sipariş verir
2. Stok: `20 adet` → `20 adet (10 rezerve)`
3. Admin üretime alır → Hala `20 adet (10 rezerve)`
4. Admin üretimi tamamlar → Hala `20 adet (10 rezerve)`
5. Admin hazırlar → Hala `20 adet (10 rezerve)`
6. Admin teslim eder → `20 adet` (rezerve düştü)

### **Senaryo 2: Stok Ekleme**
1. Admin stok ekler (50 adet)
2. Stok: `20 adet` → `70 adet`
3. Rezerveler etkilenmez

### **Senaryo 3: Sipariş İptali**
1. Sipariş iptal edilir
2. Eğer "hazirlandi" ise: Stok geri eklenir
3. Rezerve stok düşer

---

## 📞 DESTEK

Sorularınız için:
- Kod: `src/lib/stock.ts`
- API: `src/app/api/inventory/`, `src/app/api/orders/`
- Sayfalar: `src/app/stok-yonetimi/`, `src/app/siparis-takip/`, `src/app/uretim-takip/`

