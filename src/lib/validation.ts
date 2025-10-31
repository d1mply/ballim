export function parseIntSafe(value: string | null, field: string): number {
  if (value === null || value === undefined) throw new Error(`${field} gerekli`);
  const num = Number.parseInt(String(value), 10);
  if (Number.isNaN(num)) throw new Error(`${field} geçerli bir sayı olmalı`);
  return num;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} gerekli`);
  return value.trim();
}

export function requirePositiveInt(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${field} pozitif tam sayı olmalı`);
  return value;
}


