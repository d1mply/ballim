export type SalesPoint = {
  name: string;
  city?: string;
  url?: string; // Google Maps veya web sitesi
  logoUrl?: string; // Opsiyonel küçük logo
};

// Yönetilebilir satış noktaları listesi
// İstediğiniz gibi düzenleyebilirsiniz
export const salesPoints: SalesPoint[] = [
  {
    name: 'Rengarenk Kırtasiye Ambalaj Party Store',
    url: 'https://maps.app.goo.gl/aDWaNxyvwXnZwbds8',
  },
  {
    name: 'Ahsen Market', // Fallback isim; meta başlık çekilemezse bu görünecek
    url: 'https://maps.app.goo.gl/2E8pDDKBbQ9nsrES8',
  },
  // { name: 'Örnek Müşteri', url: 'https://maps.app.goo.gl/bEHxUML1iExRy49r9' },
];


