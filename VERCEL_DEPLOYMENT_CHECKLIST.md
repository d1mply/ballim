# Vercel Deployment Checklist 🚀

## ✅ ÖNCELİKLE KONTROL EDİLMESİ GEREKENLER

### 1. **Environment Variables (Vercel Dashboard)**
Vercel Dashboard → Settings → Environment Variables kısmında şunlar eklenmiş olmalı:

#### **Veritabanı Bağlantısı (PostgreSQL)**
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

**VEYA** (Ayrı ayrı)
```
DB_USER=postgres
DB_HOST=your-db-host.com
DB_NAME=ballim
DB_PASSWORD=your-password
DB_PORT=5432
```

#### **Node Environment**
```
NODE_ENV=production
```

---

### 2. **PostgreSQL Veritabanı (Production)**

#### **Önerilen Servisler:**
- ✅ **Supabase** (Ücretsiz + Kolay kurulum)
- ✅ **Neon** (Serverless Postgres)
- ✅ **Railway** (Kolay yönetim)
- ✅ **Render** (Postgres otomatik kurulum)

#### **Veritabanı Ayarları:**
- SSL aktif olmalı (`sslmode=require`)
- Connection pooling etkin
- Public access açık (sadece SSL ile)

---

### 3. **Build Ayarları (Vercel Dashboard)**

#### **Build Command:**
```bash
npm run build
```

#### **Output Directory:**
```
.next
```

#### **Install Command:**
```bash
npm install
```

#### **Root Directory:**
```
./
```

---

### 4. **Vercel Fonksiyonları İçin Max Duration**

Vercel'de fonksiyonların default timeout'u 10 saniye. Uzun süren API'ler için:

**Vercel Dashboard → Settings → Functions → Max Duration:**
- Free plan: 10s (varsayılan)
- Pro plan: 60s

**Önemli:** Veritabanı bağlantısı uzun sürüyorsa timeout artırılmalı!

---

### 5. **Regions (Bölgeler)**

Vercel fonksiyonları ve veritabanı aynı bölgede olmalı (düşük latency için):
- Veritabanı: `eu-central-1` (Frankfurt)
- Vercel: `fra1` (Frankfurt)

**Vercel Dashboard → Settings → Functions → Regions**

---

## 🔧 HATA AYIKLAMA ADIMLARİ

### **500 Hataları İçin:**

1. **Vercel Logs Kontrol Et:**
   - Vercel Dashboard → Deployments → Son deployment → View Function Logs
   - API hatalarını görürsün

2. **Database Connection Test:**
   ```
   https://your-site.vercel.app/api/debug/connection
   ```

3. **Schema Kontrol:**
   ```
   https://your-site.vercel.app/api/debug/schema
   ```

4. **DB Setup Çalıştır:**
   ```
   https://your-site.vercel.app/api/db-setup
   ```

---

## 📋 DEPLOYMENT SONRASI KONTROL

### **1. API Testleri:**
```
✅ /api/products
✅ /api/customers
✅ /api/orders
✅ /api/filaments
✅ /api/debug/connection
```

### **2. Sayfa Testleri:**
```
✅ / (Ana Sayfa - Login)
✅ /urunler (Ürünler)
✅ /musteriler (Müşteriler)
✅ /siparis-takip (Sipariş Takip)
✅ /uretim-takip (Üretim Takip)
✅ /stok-yonetimi (Stok Yönetimi)
```

### **3. Veritabanı Bağlantısı:**
```bash
# Production DB'ye bağlan ve test et
psql "postgresql://user:password@host:port/database?sslmode=require"

# Tabloları kontrol et
\dt

# Veri kontrolü
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM orders;
```

---

## 🚨 SIKÇA KARŞILAŞILAN HATALAR

### **1. "Cannot connect to database"**
**Çözüm:**
- `DATABASE_URL` doğru mu kontrol et
- SSL aktif mi kontrol et (`sslmode=require`)
- Veritabanı public access açık mı kontrol et

### **2. "Table does not exist"**
**Çözüm:**
- Production DB'de tabloları oluştur
- `/api/db-setup` endpoint'ini çalıştır

### **3. "Function timeout"**
**Çözüm:**
- Vercel Dashboard'da max duration artır
- Connection pooling optimize et

### **4. "Environment variables not found"**
**Çözüm:**
- Vercel Dashboard → Settings → Environment Variables
- Tüm değişkenleri ekle
- Redeploy yap

---

## 🎯 HIZLI FIX

Eğer hala 500 hatası alıyorsan:

1. **Vercel Dashboard → Deployments → Son deployment → View Function Logs**
2. Hata loglarını bul
3. Aşağıdaki detayları paylaş:
   - Hata mesajı
   - Hangi API endpoint'te
   - Environment variables ekli mi

---

## 📞 DESTEK

Eğer yukarıdakiler çözmezse, şunları gönder:
1. Vercel deployment logs (son 50 satır)
2. Environment variables listesi (değerler olmadan)
3. Hangi sayfa/API'de hata aldığın

**GitHub:** https://github.com/d1mply/ballim

