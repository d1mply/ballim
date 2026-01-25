import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test for React components
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NODE_ENV = 'test';

// Mock console methods to keep test output clean
// Uncomment if you want to suppress console output in tests
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

// Global fetch mock
global.fetch = vi.fn();

// Reset fetch mock before each test
afterEach(() => {
  vi.mocked(global.fetch).mockReset();
});
