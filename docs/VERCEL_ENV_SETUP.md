# Vercel Environment Variables Kurulum Rehberi 🔐

## 📋 LOCAL'DE ÇALIŞAN AYARLAR

Local'de şu environment variable'lar kullanılıyor:

```env
# Veritabanı Bağlantı Bilgileri
DB_USER=postgres
DB_HOST=localhost
DB_NAME=ballim
DB_PASSWORD=ballim146161
DB_PORT=5432

# Next.js Ayarları
NEXTAUTH_SECRET=ballim-secret-key-2024
NEXTAUTH_URL=http://localhost:3000

# Geliştirme/Üretim Modu
NODE_ENV=development
```

---

## 🚀 VERCEL İÇİN GEREKLİ AYARLAR

### **ÖNEMLİ:** Vercel'de 2 farklı yöntem var:

### **Yöntem 1: DATABASE_URL (ÖNERİLEN) ✅**

Bu yöntemde tek bir connection string kullanılır:

```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
NODE_ENV=production
NEXTAUTH_SECRET=ballim-secret-key-2024
NEXTAUTH_URL=https://ballim.vercel.app
```

### **Yöntem 2: Ayrı Değişkenler**

Her biri ayrı ayrı eklenebilir:

```env
DB_USER=postgres
DB_HOST=your-production-db-host.com
DB_NAME=ballim
DB_PASSWORD=your-production-password
DB_PORT=5432
NODE_ENV=production
NEXTAUTH_SECRET=ballim-secret-key-2024
NEXTAUTH_URL=https://ballim.vercel.app
```

---

## 🎯 ADIM ADIM VERCEL KURULUMU

### **1. Production Veritabanı Hazırla**

#### **Supabase (ÖNERİLEN - ÜCRETSİZ)**

1. https://supabase.com adresine git
2. "New Project" oluştur
3. Project Settings → Database → Connection String → URI kopyala

**Örnek:**
```
postgresql://postgres.xyz:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

#### **Railway**

1. https://railway.app adresine git
2. "New Project" → "Add PostgreSQL"
3. PostgreSQL → Connect → Connection URL kopyala

#### **Neon**

1. https://neon.tech adresine git
2. "Create Project"
3. Connection Details → Connection String kopyala

---

### **2. Vercel Dashboard'da Environment Variables Ekle**

1. **Vercel Dashboard'a git:** https://vercel.com/dashboard
2. **Projeyi seç:** `ballim`
3. **Settings** sekmesine tıkla
4. **Environment Variables** sekmesine tıkla
5. **Aşağıdaki değişkenleri ekle:**

#### **Gerekli Değişkenler:**

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |
| `NEXTAUTH_SECRET` | `ballim-secret-key-2024` | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://ballim.vercel.app` | Production |
| `NEXTAUTH_URL` | `https://ballim-git-*.vercel.app` | Preview |

---

### **3. DATABASE_URL Nasıl Oluşturulur?**

#### **Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

#### **Örnek (Supabase):**
```
postgresql://postgres.abcdefgh:MySecurePassword123@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
```

#### **Önemli Notlar:**
- ✅ Şifrenizdeki özel karakterleri encode edin (ör: `@` → `%40`, `#` → `%23`)
- ✅ Sonuna mutlaka `?sslmode=require` ekleyin
- ✅ Port numarası genelde `5432` (PostgreSQL default)

---

### **4. Veritabanı Tablolarını Oluştur**

Production veritabanınızda tablolar yok! Şu adımları izle:

#### **Yöntem 1: API Endpoint ile (KOLAY)**

Deploy edildikten sonra tarayıcıdan şu URL'yi aç:
```
https://ballim.vercel.app/api/db-setup
```

Bu endpoint tüm tabloları otomatik oluşturur.

#### **Yöntem 2: Manuel SQL (GELİŞMİŞ)**

Supabase/Railway/Neon dashboard'unda SQL Editor'ü aç ve `src/lib/db.ts` dosyasındaki `createTables()` fonksiyonundaki SQL komutlarını çalıştır.

---

### **5. Deploy ve Test**

1. **Vercel'e push at:**
   ```bash
   git push origin main
   ```

2. **Otomatik deploy olur**

3. **Test et:**
   ```
   https://ballim.vercel.app/api/debug/connection  ← DB bağlantı testi
   https://ballim.vercel.app/api/debug/schema      ← Tablo kontrol
   https://ballim.vercel.app                        ← Ana sayfa
   ```

---

## 🐛 HATA AYIKLAMA

### **"Cannot connect to database" Hatası**

**Çözüm:**
```bash
# 1. DATABASE_URL doğru mu kontrol et
echo $DATABASE_URL

# 2. SSL gerekli mi kontrol et
# URL'nin sonunda ?sslmode=require var mı?

# 3. Veritabanı public access açık mı kontrol et
# Supabase: Settings → Database → Connection Pooling → Enable
# Railway/Neon: Otomatik açık
```

### **"Table does not exist" Hatası**

**Çözüm:**
```
https://ballim.vercel.app/api/db-setup
```
Bu endpoint'i çağır, tabloları oluşturur.

### **"Function timeout" Hatası**

**Çözüm:**
- Vercel Dashboard → Settings → Functions → Max Duration: 60s
- (Pro plan gerekiyor, Free plan max 10s)

---

## 📊 ÖRNEK PRODUCTION SETUP

### **Supabase + Vercel (ÖNERİLEN)**

```env
# Vercel Environment Variables:
DATABASE_URL=postgresql://postgres.xyz:pass@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
NODE_ENV=production
NEXTAUTH_SECRET=ballim-secret-key-2024
NEXTAUTH_URL=https://ballim.vercel.app
```

**Avantajlar:**
- ✅ Ücretsiz
- ✅ Otomatik backup
- ✅ Kolay yönetim
- ✅ Connection pooling
- ✅ Aynı bölgede (düşük latency)

---

## 🎯 CHECKLIST

Deploy etmeden önce kontrol et:

- [ ] Production PostgreSQL hazır (Supabase/Railway/Neon)
- [ ] DATABASE_URL Vercel'e eklendi
- [ ] NODE_ENV=production eklendi
- [ ] NEXTAUTH_SECRET eklendi
- [ ] NEXTAUTH_URL eklendi (doğru URL ile)
- [ ] Vercel'e push atıldı
- [ ] Deploy tamamlandı
- [ ] `/api/db-setup` çalıştırıldı
- [ ] `/api/debug/connection` test edildi
- [ ] Ana sayfa çalışıyor

---

## 💡 İPUÇLARI

1. **Free Tier Limitler:**
   - Supabase: 500MB DB, 2GB transfer/ay
   - Railway: 500MB DB, $5 credit/ay
   - Neon: 3GB DB, 100 saat compute/ay

2. **Performans:**
   - DB ve Vercel aynı bölgede olsun (ör: EU Central)
   - Connection pooling kullan
   - Cache stratejisi ekle

3. **Güvenlik:**
   - Asla şifreleri GitHub'a pushlamayın
   - Environment variables kullanın
   - SSL/TLS her zaman aktif

---

## 📞 YARDIM

Hala sorun varsa:
1. Vercel → Deployments → View Function Logs
2. Hata mesajını kopyala
3. Bana gönder!

