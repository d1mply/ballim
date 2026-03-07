import { z } from 'zod';

// Customer form
export const customerSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalı'),
  phone: z.string().optional(),
  email: z.string().email('Geçersiz e-posta adresi').optional().or(z.literal('')),
  company: z.string().optional(),
  address: z.string().optional(),
  customer_type: z.enum(['Bireysel', 'Kurumsal']).default('Bireysel'),
  customer_category: z.enum(['normal', 'premium', 'vip', 'wholesale']).default('normal'),
  discount_rate: z.number().min(0).max(100).default(0),
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter'),
  password: z.string().min(6, 'Şifre en az 6 karakter'),
  tax_no: z.string().optional(),
  tax_office: z.string().optional(),
});
export type CustomerFormData = z.infer<typeof customerSchema>;

// Product form
export const productSchema = z.object({
  productCode: z.string().min(1, 'Ürün kodu gerekli'),
  productType: z.string().min(1, 'Ürün tipi gerekli'),
  imagePath: z.string().nullable().optional(),
  barcode: z.string().optional(),
  capacity: z.number().min(0).default(0),
  dimensionX: z.number().min(0).default(0),
  dimensionY: z.number().min(0).default(0),
  dimensionZ: z.number().min(0).default(0),
  printTime: z.number().min(0).default(0),
  totalGram: z.number().min(0).default(0),
  pieceGram: z.number().min(0).default(0),
  filePath: z.string().nullable().optional(),
  notes: z.string().optional(),
});
export type ProductFormData = z.infer<typeof productSchema>;

// Order form
export const orderSchema = z.object({
  customer_id: z.number().positive('Müşteri seçiniz'),
  items: z
    .array(
      z.object({
        product_id: z.number().positive(),
        quantity: z.number().positive("Miktar 0'dan büyük olmalı"),
      })
    )
    .min(1, 'En az bir ürün ekleyin'),
  notes: z.string().optional(),
});
export type OrderFormData = z.infer<typeof orderSchema>;

// Payment form
export const paymentSchema = z.object({
  musteri_id: z.number().positive('Müşteri seçiniz'),
  siparis_id: z.number().optional(),
  odeme_tarihi: z.string().min(1, 'Ödeme tarihi gerekli'),
  tutar: z.number().positive("Tutar 0'dan büyük olmalı"),
  odeme_yontemi: z.string().min(1, 'Ödeme yöntemi gerekli'),
  vade_ay: z.number().optional(),
  durum: z.enum(['Ödendi', 'Beklemede', 'İptal']).default('Ödendi'),
  aciklama: z.string().optional(),
});
export type PaymentFormData = z.infer<typeof paymentSchema>;

// Login form
export const loginSchema = z.object({
  username: z.string().min(1, 'Kullanıcı adı gerekli'),
  password: z.string().min(1, 'Şifre gerekli'),
  type: z.enum(['admin', 'customer']),
});
export type LoginFormData = z.infer<typeof loginSchema>;

// User (RBAC) form
export const userSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter'),
  password: z.string().min(8, 'Şifre en az 8 karakter'),
  name: z.string().min(2, 'İsim en az 2 karakter'),
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  role_id: z.number().positive('Rol seçiniz'),
});
export type UserFormData = z.infer<typeof userSchema>;

export function getFirstError(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null;
  return result.error.errors[0]?.message ?? 'Doğrulama hatası';
}
