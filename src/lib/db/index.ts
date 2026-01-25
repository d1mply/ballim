/**
 * Database Module - Centralized PostgreSQL Database Access
 * 
 * This module provides:
 * - Connection pool management
 * - SQL injection protection
 * - Query execution with logging
 * - Table migrations
 */

// Re-export pool for direct access if needed
export { pool, testConnection } from './pool';

// Re-export query helper
export { query } from './query';
export type { QueryParams } from './query';

// Re-export validation utilities
export { validateQuery } from './validation';
export type { ValidationResult } from './validation';

// Note: createTables is imported from the original db.ts for now
// to avoid duplicating the large migration code
// TODO: Extract migrations to separate file when needed
