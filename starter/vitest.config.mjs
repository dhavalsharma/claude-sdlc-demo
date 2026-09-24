import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname) } },
  test: { environment: 'node', include: ['**/*.test.{js,jsx,mjs}'], exclude: ['node_modules', '.next'] },
});
