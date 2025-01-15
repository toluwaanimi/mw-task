/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config';
import * as path from 'path';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    exclude: [...configDefaults.exclude, 'packages/template/*'],
    reporters: 'verbose',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src'),
      '~root': path.resolve(__dirname, '.'),
    },
  },
  plugins: [swc.vite()],
});
