# Test Yazma Prompt Şablonu - Ballim Projesi

## Orijinal Prompt (Yetersiz)
```
Bu kodun testlerini yaz. %100 coverage istiyorum. Her edge case düşün. 
Hata bulursan düzelt. Tek seferde bitir çünkü her token çocuklarımın 
rızkından gidiyor. Revizyon lüksüm yok.
```

## Sorunlar ve Çözümler

| # | Eksik | Neden Sorun? | Çözüm |
|---|-------|--------------|-------|
| 1 | Hedef belirsiz | AI hangi dosyayı test edeceğini bilmiyor | Tam dosya yolu ver |
| 2 | Framework yok | Jest mi Vitest mi? | Framework belirt |
| 3 | Test türü yok | Unit mi integration mı? | Tür belirt |
| 4 | Mock stratejisi yok | DB nasıl mock'lanacak? | Mock kuralları ekle |
| 5 | Dosya yapısı yok | Test nereye yazılacak? | Konum belirt |
| 6 | Öncelik yok | Hangi fonksiyonlar kritik? | Öncelik listesi ver |
| 7 | Kabul kriterleri eksik | %100 ne demek? | Detaylı metrikler ver |

---

## GELİŞTİRİLMİŞ PROMPT ŞABLONU

Aşağıdaki şablonu kopyalayıp `[PLACEHOLDER]` kısımlarını doldurun:

```markdown
## GÖREV: [DOSYA_ADI] için Kapsamlı Test Suite Yaz

### 1. BAĞLAM
- **Proje:** Next.js 15 + TypeScript + PostgreSQL
- **Test Framework:** Vitest + @testing-library/react
- **Hedef Dosya:** [TAM_DOSYA_YOLU]
- **Dosya Boyutu:** [X] satır
- **Modül Türü:** [lib | component | api | hook | util]

### 2. TEST DOSYASI KONUMU
- Test dosyası: `__tests__/[modul-adi].test.ts`
- Eğer component ise: `__tests__/components/[ComponentAdi].test.tsx`
- Eğer API ise: `__tests__/api/[route-adi].test.ts`

### 3. MOCK STRATEJİSİ
Aşağıdaki bağımlılıkları mock'la:
- `src/lib/db.ts` → query fonksiyonu mock'lanmalı
- `fetch` → global fetch mock'lanmalı
- `process.env` → test environment değişkenleri

Mock örneği:
```typescript
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}));
```

### 4. COVERAGE HEDEFLERİ
- **Line Coverage:** %95+ (minimum)
- **Branch Coverage:** %90+
- **Function Coverage:** %100
- **Kritik Fonksiyonlar:** [FONKSİYON_LİSTESİ] → %100 zorunlu

### 5. ZORUNLU EDGE CASES
Her fonksiyon için şunları test et:
- [ ] Normal/başarılı senaryo (happy path)
- [ ] `null` input
- [ ] `undefined` input
- [ ] Boş string `""`
- [ ] Boş array `[]`
- [ ] Boş object `{}`
- [ ] Negatif sayılar
- [ ] Sıfır değeri
- [ ] Çok büyük sayılar (Number.MAX_SAFE_INTEGER)
- [ ] Geçersiz tip (string yerine number vb.)
- [ ] Async hata senaryoları (reject)
- [ ] Timeout senaryoları

### 6. TEST YAPISI
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('[ModülAdı]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('[fonksiyonAdı]', () => {
    it('başarılı senaryo: [açıklama]', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('hata senaryosu: null input ile hata fırlatmalı', () => {
      // ...
    });

    it('edge case: boş array için boş sonuç döndürmeli', () => {
      // ...
    });
  });
});
```

### 7. ASSERTION KURALLARI
- `expect().toBe()` → primitive değerler için
- `expect().toEqual()` → object/array karşılaştırması için
- `expect().toThrow()` → hata fırlatma kontrolü için
- `expect().rejects.toThrow()` → async hata kontrolü için
- `expect().toHaveBeenCalledWith()` → mock çağrı kontrolü için

### 8. ÖNCELİK SIRASI
Test yazarken bu sırayı takip et:
1. **Kritik iş mantığı** (para hesaplama, güvenlik)
2. **Validasyon fonksiyonları**
3. **API handlers**
4. **Utility fonksiyonlar**
5. **UI components**

### 9. HATA BULURSAN
1. ÖNCE hatayı düzelt
2. Düzeltme için yorum ekle: `// FIX: [açıklama]`
3. SONRA testi yaz
4. Hem eski (hatalı) davranışı hem yeni (düzeltilmiş) davranışı test et

### 10. YASAKLAR
- ❌ `console.log` kullanma (test çıktısını kirletir)
- ❌ Gerçek DB'ye bağlanma
- ❌ Gerçek API çağrısı yapma
- ❌ `any` type kullanma
- ❌ Test içinde `setTimeout` ile bekleme (fake timers kullan)
- ❌ Testler arası bağımlılık oluşturma

### 11. ÇIKTI BEKLENTİSİ
Tek seferde şunları ver:
1. Tam test dosyası kodu
2. Gerekirse mock dosyaları
3. Bulunan hatalar ve düzeltmeleri
4. Coverage özeti (tahmini)
```

---

## ÖRNEK: pricing.ts için Doldurulmuş Prompt

```markdown
## GÖREV: pricing.ts için Kapsamlı Test Suite Yaz

### 1. BAĞLAM
- **Proje:** Next.js 15 + TypeScript + PostgreSQL
- **Test Framework:** Vitest
- **Hedef Dosya:** src/lib/pricing.ts
- **Dosya Boyutu:** 269 satır
- **Modül Türü:** lib (iş mantığı)

### 2. TEST DOSYASI KONUMU
- Test dosyası: `__tests__/lib/pricing.test.ts`

### 3. MOCK STRATEJİSİ
```typescript
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}));
```

### 4. COVERAGE HEDEFLERİ
- Line Coverage: %95+
- Branch Coverage: %90+
- Kritik Fonksiyonlar (ZORUNLU %100):
  - `calculateNormalCustomerPrice`
  - `calculateWholesaleCustomerPrice`
  - `calculateOrderItemPrice`
  - `getWholesalePriceDetails`

### 5. ZORUNLU EDGE CASES
- Normal müşteri: filament fiyatı bulunamadığında varsayılan kullanılmalı
- Toptancı: fiyat aralığı bulunamadığında hata fırlatmalı
- Ürün bulunamadığında hata fırlatmalı
- Müşteri bulunamadığında hata fırlatmalı
- quantity = 0 durumu
- quantity negatif durumu
- capacity ve piece_gram ikisi de null olduğunda
- Pazaryeri siparişi (customerId = null) → 0.01 döndürmeli

### 6-11. [Yukarıdaki şablonla aynı]
```

---

## HIZLI KULLANIM

Minimum bilgiyle kullanmak için:

```
[DOSYA_YOLU] dosyası için Vitest ile test yaz.

Mock: src/lib/db.ts → query fonksiyonu
Coverage: %95+ line, %90+ branch
Edge cases: null, undefined, boş değerler, negatif sayılar, async hatalar

Test dosyası: __tests__/[dosya-adi].test.ts

Hata bulursan önce düzelt, sonra test yaz. Console.log kullanma.
```

---

## NOTLAR

1. Bu şablon Ballim projesi için optimize edilmiştir
2. Vitest + @testing-library/react stack'i önerilir
3. Her test izole çalışabilmeli
4. Mock'lar `beforeEach`'de temizlenmeli
