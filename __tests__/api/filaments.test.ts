import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, getResponseJson } from '@test-mocks/request';

vi.mock('@/lib/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/errors', () => ({
  validateFilamentData: vi.fn((d: unknown) => d),
  handleApiError: vi.fn((e: { statusCode: number; error: string }) => e),
  handleDatabaseError: vi.fn((e: Error) => ({ statusCode: 500, error: e.message })),
}));
vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn(),
  getUserFromRequest: vi.fn().mockResolvedValue({ userId: 'test', role: 'admin' }),
}));

describe('API filaments', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await import('@/lib/db');
    vi.mocked(db.query).mockResolvedValue({
      rows: [
        {
          id: 1,
          filament_code: 'PLA-RED-001',
          name: 'PLA Kırmızı',
          type: 'PLA',
          brand: 'X',
          color: 'Kırmızı',
          location: 'A1',
          total_weight: 1000,
          remaining_weight: 500,
          quantity: 1,
          critical_stock: 100,
          temp_range: '190-210',
          cap: 0,
          price_per_gram: 0.05,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      rowCount: 1,
    });
  });

  describe('GET /api/filaments', () => {
    it('filament listesi 200 ve array döndürmeli', async () => {
      const { GET } = await import('@/app/api/filaments/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json[0]).toHaveProperty('code', 'PLA-RED-001');
      expect(json[0]).toHaveProperty('type', 'PLA');
      expect(json[0]).toHaveProperty('remainingWeight', 500);
    });
  });
});
