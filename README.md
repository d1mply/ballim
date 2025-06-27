# Ballim - Filament Stok Takip Sistemi

3D yazıcı filament stoklarını takip etmek ve sipariş yönetimi yapmak için geliştirilmiş modern bir Next.js uygulaması.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

## 🚀 Özellikler

- **📦 Filament Stok Yönetimi**: Çok renkli filament stoklarını gram bazında takip
- **🏭 Üretim Takibi**: Sipariş durumlarını takip etme
- **👥 Müşteri Yönetimi**: Müşteri bilgileri ve sipariş geçmişi
- **💰 Cari Hesap**: Müşteri ödemelerini takip etme
- **📊 Dashboard**: Gerçek zamanlı istatistikler ve raporlar
- **🔐 Güvenlik**: Rol tabanlı erişim kontrolü

## 🛠️ Teknolojiler

- **Framework**: Next.js 14 (App Router)
- **Veritabanı**: PostgreSQL
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety
- **Real-time**: WebSocket entegrasyonu

## 🚀 Kurulum

### Ön Gereksinimler

- Node.js 18+
- PostgreSQL
- npm/yarn/pnpm

### Adımlar

1. **Repository'yi klonlayın**
   ```bash
   git clone https://github.com/d1mply/ballim.git
   cd ballim
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Veritabanını kurun**
   - PostgreSQL'de `ballim` adında bir veritabanı oluşturun
   - `src/lib/db.ts` dosyasındaki bağlantı bilgilerini güncelleyin

4. **Migration'ları çalıştırın**
   ```bash
   npm run dev
   ```
   Ardından: `http://localhost:3000/api/db-setup` POST endpoint'ini çağırın

5. **Uygulamayı başlatın**
   ```bash
   npm run dev
   ```

6. **Tarayıcıda açın**
   ```
   http://localhost:3000
   ```

## 📁 Proje Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin-dashboard/   # Admin paneli
│   ├── filamentler/       # Filament yönetimi
│   ├── urunler/          # Ürün yönetimi
│   └── ...
├── components/            # React bileşenleri
├── lib/                  # Utility fonksiyonları
│   ├── db.ts            # Veritabanı bağlantısı
│   ├── security.ts      # Güvenlik middleware
│   └── stock.ts         # Stok yönetimi
└── types/               # TypeScript tip tanımları
```

## 🔑 Temel Özellikler

### Çok Renkli Filament Sistemi
- Her ürün birden fazla filament rengi kullanabilir
- Gram bazında hassas stok takibi
- Otomatik stok düşme sistemi (üretim tamamlandığında)

### Gelişmiş Sipariş Yönetimi
- Sipariş durumu takibi
- Üretim süreci yönetimi
- Otomatik stok hesaplama

### Dashboard ve Raporlama
- Gerçek zamanlı stok durumu
- Satış istatistikleri
- Müşteri analizi

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

Proje Sahibi: [@d1mply](https://github.com/d1mply)

Proje Linki: [https://github.com/d1mply/ballim](https://github.com/d1mply/ballim)