# Vercel Deployment Test Checklist

## 1. Deployment Sonrası Kontroller

### A. Veritabanı Bağlantısı
- [ ] `https://ballim.vercel.app/api/db-setup` adresine git
- [ ] Başarılı mesajı görüyor musun? ("Tablolar başarıyla oluşturuldu")
- [ ] Eğer hata varsa, error mesajını not al

### B. API Endpoint Testleri
Aşağıdaki URL'leri tarayıcıda test et:

1. **Ürünler API:**
   ```
   https://ballim.vercel.app/api/products
   ```
   - Beklenen: JSON array (boş olabilir: `[]`)
   - Hata durumu: `{"error": "..."}`

2. **Müşteriler API:**
   ```
   https://ballim.vercel.app/api/customers
   ```
   - Beklenen: STOK müşterisi görmeli
   - `[{"id":1,"name":"STOK","customer_code":"STOK-001",...}]`

3. **Siparişler API:**
   ```
   https://ballim.vercel.app/api/orders/production
   ```
   - Beklenen: Boş array veya sipariş listesi
   - `{"orders":[],"totals":{...}}`

### C. Frontend Testleri
1. **Anasayfa:**
   - [ ] `https://ballim.vercel.app` açılıyor mu?
   - [ ] Login ekranı görünüyor mu?
   - [ ] Katalog kartları yükleniyor mu?
   - [ ] Satış noktaları haritası görünüyor mu?

2. **Login:**
   - [ ] Username: `stok`, Password: `stok123` ile giriş yap
   - [ ] Dashboard'a yönlendiriliyor musun?
   - [ ] Console'da hata var mı? (F12 > Console)

3. **Stok Sayfası:**
   - [ ] `Stok & Sipariş` menüsüne tıkla
   - [ ] Ürünler yükleniyor mu?
   - [ ] Console'da `500` hatası var mı?

4. **Üretim Takip:**
   - [ ] `Üretim Takip` sayfasına git
   - [ ] Siparişler görünüyor mu?
   - [ ] Filtre butonları çalışıyor mu?

## 2. Hata Durumunda

### A. Console Hatası Varsa
- F12 > Console sekmesini aç
- Kırmızı hataları kopyala
- Network sekmesinde başarısız istekleri kontrol et
- Failed requestlerin Response'larını kontrol et

### B. Vercel Logs Kontrol
1. Vercel Dashboard → Projen → **Runtime Logs**
2. Son 1 saatin loglarını filtrele
3. `error` veya `failed` içeren satırları ara
4. Özellikle şu hataları ara:
   - `password authentication failed`
   - `connection refused`
   - `timeout`
   - `SSL`

### C. Supabase Logs Kontrol
1. Supabase Dashboard → Project → **Logs**
2. **Database** sekmesi
3. Son bağlantı denemelerini kontrol et
4. Başarısız authentication denemelerini ara

## 3. Ortak Hatalar ve Çözümleri

### ❌ "password authentication failed"
**Çözüm:**
- Supabase'de yeni şifre oluştur
- Vercel `DATABASE_URL`'i güncelle
- Redeploy yap

### ❌ "self-signed certificate"
**Çözüm:**
- `DATABASE_URL` sonuna `?sslmode=disable` ekle
- VEYA `src/lib/db.ts` içinde `ssl: false` ayarını kontrol et

### ❌ "connection timeout"
**Çözüm:**
- Supabase database'in çalışır durumda olduğunu kontrol et
- Supabase Project Settings → Database → Status: "Healthy" mi?
- Connection pooler ayarlarını kontrol et (Port: 5432)

### ❌ "relation does not exist"
**Çözüm:**
- `/api/db-setup` endpoint'ini çalıştır
- Supabase SQL Editor'de tabloları manuel oluştur
- `SUPABASE_SQL_SETUP.sql` dosyasını çalıştır

## 4. Başarı Kriterleri

Aşağıdaki tüm adımlar başarılıysa deployment BAŞARILI:

- [x] `https://ballim.vercel.app` açılıyor
- [x] Login yapılabiliyor
- [x] Ürünler/müşteriler yükleniyor
- [x] Console'da kritik hata yok
- [x] Vercel logs'ta `500` hatası yok
- [x] Tüm sayfalar çalışıyor

## 5. İletişim Template'i

Eğer sorun devam ederse, bana şu bilgileri ver:

```
1. Hangi sayfada hata aldın?
   URL: 

2. Console hatası (F12 > Console):
   [Kopyala yapıştır]

3. Network hatası (F12 > Network > Failed request > Response):
   [Kopyala yapıştır]

4. Vercel Runtime Logs (son 5-10 satır):
   [Kopyala yapıştır]

5. Supabase Database Status:
   [Healthy / Unhealthy / Paused]
```

