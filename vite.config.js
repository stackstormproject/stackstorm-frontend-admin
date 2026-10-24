import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/tests/**', 'src/**/*.test.{js,jsx}', 'src/main.jsx'],
      thresholds: { lines: 80, branches: 60, functions: 55, statements: 80 },
    },
  },
});