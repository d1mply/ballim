import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global test setup
    setupFiles: ['./__tests__/setup.ts'],
    
    // Include patterns
    include: ['__tests__/**/*.test.{ts,tsx}'],
    
    // Exclude patterns
    exclude: ['node_modules', 'dist', '.next'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/types/**',
        'src/app/**/layout.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 85,
        statements: 80,
      },
    },
    
    // Globals for expect, describe, it, etc.
    globals: true,
    
    // Timeout for async tests
    testTimeout: 10000,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
