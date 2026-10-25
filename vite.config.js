import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/stackstorm-frontend-admin-old/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/tests/**',
        'src/**/*.test.{js,jsx}',
        'src/main.jsx',
        '**/stackstorm-frontend-admin-old/**',
      ],
      thresholds: { lines: 80, branches: 60, functions: 55, statements: 80 },
    },
  },
});
