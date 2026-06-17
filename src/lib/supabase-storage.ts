import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

let adminClient: SupabaseClient | null = null;

function getServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY
  );
}

function extractProjectRefFromDatabaseUrl(databaseUrl: string): string | null {
  const dbHostMatch = databaseUrl.match(/db\.([a-z0-9]+)\.supabase\.co/i);
  if (dbHostMatch) return dbHostMatch[1];

  const poolerUserMatch = databaseUrl.match(/postgres\.([a-z0-9]+):/i);
  if (poolerUserMatch) return poolerUserMatch[1];

  const projectHostMatch = databaseUrl.match(/([a-z0-9]+)\.supabase\.co/i);
  if (projectHostMatch) return projectHostMatch[1];

  return null;
}

function getSupabaseUrl(): string | undefined {
  const explicit =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (explicit) return explicit.replace(/\/$/, '');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  const projectRef = extractProjectRefFromDatabaseUrl(databaseUrl);
  if (!projectRef) return undefined;

  return `https://${projectRef}.supabase.co`;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) return null;

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

export function getProductImagePublicUrl(storagePath: string): string | null {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

let bucketEnsured = false;

export async function ensureProductImagesBucket(): Promise<void> {
  if (bucketEnsured) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase Storage yapılandırılmamış.');
  }

  const { data: existing, error: getError } = await supabase.storage.getBucket(PRODUCT_IMAGES_BUCKET);

  if (existing && !getError) {
    bucketEnsured = true;
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
  });

  if (createError) {
    const message = createError.message.toLowerCase();
    if (message.includes('already exists') || message.includes('duplicate')) {
      bucketEnsured = true;
      return;
    }
    throw new Error(`Storage bucket oluşturulamadı: ${createError.message}`);
  }

  bucketEnsured = true;
}
