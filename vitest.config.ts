import { defineConfig } from 'vitest/config';

// Unit tests only. Playwright owns tests/*.spec.ts; rollup does not read this file.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
