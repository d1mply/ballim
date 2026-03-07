/**
 * Optional test helpers for database mock.
 * Each test file still defines vi.mock('@/lib/db'); this module provides
 * reusable mock implementations for consistent query return shapes.
 */

export interface MockQueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

export function createMockQueryResult<T>(rows: T[]): MockQueryResult<T> {
  return {
    rows,
    rowCount: rows.length,
  };
}

export function createEmptyQueryResult(): MockQueryResult {
  return { rows: [], rowCount: 0 };
}

export function createSingleRowResult<T>(row: T): MockQueryResult<T> {
  return { rows: [row], rowCount: 1 };
}
