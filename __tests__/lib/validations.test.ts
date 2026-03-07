import { describe, it, expect } from 'vitest';
import {
  customerSchema,
  productSchema,
  paymentSchema,
  loginSchema,
  getFirstError,
} from '../../src/lib/validations';

describe('customerSchema', () => {
  it('should validate a valid customer', () => {
    const result = customerSchema.safeParse({
      name: 'Test Müşteri',
      username: 'testuser',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject customer without name', () => {
    const result = customerSchema.safeParse({
      username: 'testuser',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject customer with short username', () => {
    const result = customerSchema.safeParse({
      name: 'Test',
      username: 'ab',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional email', () => {
    const result = customerSchema.safeParse({
      name: 'Test',
      username: 'testuser',
      password: 'secret123',
      email: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('productSchema', () => {
  it('should validate a valid product', () => {
    const result = productSchema.safeParse({
      productCode: 'PRD-001',
      productType: 'PLA',
    });
    expect(result.success).toBe(true);
  });

  it('should reject product without code', () => {
    const result = productSchema.safeParse({
      productType: 'PLA',
    });
    expect(result.success).toBe(false);
  });
});

describe('paymentSchema', () => {
  it('should validate valid payment', () => {
    const result = paymentSchema.safeParse({
      musteri_id: 1,
      odeme_tarihi: '2024-01-15',
      tutar: 100,
      odeme_yontemi: 'Nakit',
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative amount', () => {
    const result = paymentSchema.safeParse({
      musteri_id: 1,
      odeme_tarihi: '2024-01-15',
      tutar: -50,
      odeme_yontemi: 'Nakit',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('should validate valid login', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'secret',
      type: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty username', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'secret',
      type: 'admin',
    });
    expect(result.success).toBe(false);
  });
});

describe('getFirstError', () => {
  it('should return null for valid result', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'secret',
      type: 'admin',
    });
    expect(getFirstError(result)).toBe(null);
  });

  it('should return first error message', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: '',
      type: 'admin',
    });
    expect(getFirstError(result)).toBe('Kullanıcı adı gerekli');
  });
});
