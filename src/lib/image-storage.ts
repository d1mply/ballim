import {
  ensureProductImagesBucket,
  getSupabaseAdmin,
  getProductImagePublicUrl,
  isSupabaseStorageConfigured,
  PRODUCT_IMAGES_BUCKET,
} from './supabase-storage';

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function isBase64ImageData(value: string): boolean {
  return /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/.test(value);
}

export function isSupabaseStorageUrl(value: string): boolean {
  return value.includes('.supabase.co/storage/v1/object/public/');
}

function sanitizeCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function parseBase64Image(imagePath: string): { ext: string; buffer: Buffer; contentType: string } | null {
  const match = imagePath.match(/^data:image\/([\w+.-]+);base64,(.+)$/);
  if (!match) return null;

  const rawExt = match[1].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt.replace('svg+xml', 'svg');
  const buffer = Buffer.from(match[2], 'base64');
  const contentType = CONTENT_TYPE_BY_EXT[ext] || 'image/jpeg';

  return { ext, buffer, contentType };
}

async function uploadToSupabase(
  buffer: Buffer,
  contentType: string,
  productCode: string,
  ext: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error(
      'Supabase Storage yapılandırılmamış. SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenlerini ekleyin.'
    );
  }

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Görsel boyutu 5 MB sınırını aşıyor.');
  }

  await ensureProductImagesBucket();

  const storagePath = `products/${sanitizeCode(productCode)}_${Date.now()}.${ext}`;
  let { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: false,
    cacheControl: '3600',
  });

  if (error?.message?.toLowerCase().includes('bucket not found')) {
    await ensureProductImagesBucket();
    ({ error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    }));
  }

  if (error) {
    throw new Error(`Supabase Storage yükleme hatası: ${error.message}`);
  }

  const publicUrl = getProductImagePublicUrl(storagePath);
  if (!publicUrl) {
    throw new Error('Görsel public URL oluşturulamadı.');
  }

  return publicUrl;
}

export async function persistProductImage(
  imagePath: string | null | undefined,
  productCode: string
): Promise<string | null> {
  if (!imagePath) return null;
  if (!isBase64ImageData(imagePath)) return imagePath;

  const parsed = parseBase64Image(imagePath);
  if (!parsed) return imagePath;

  if (!isSupabaseStorageConfigured()) {
    throw new Error(
      'Supabase Storage yapılandırılmamış. SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ekleyin (.env.local veya Vercel).'
    );
  }

  return uploadToSupabase(parsed.buffer, parsed.contentType, productCode, parsed.ext);
}
