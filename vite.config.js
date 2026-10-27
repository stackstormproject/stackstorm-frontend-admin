import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Legacy files listed in .eslintignore (#141) are outside both gates until the ticket that
// replaces them deletes them. The list shrinks to nothing by #150.
const legacyFiles = existsSync('.eslintignore')
  ? readFileSync('.eslintignore', 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  : [];

const API_TARGET = process.env.VITE_DEV_API_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/socket.io': { target: API_TARGET, ws: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/tests/**', 'src/**/*.test.{js,jsx}', ...legacyFiles],
      // Course gate: >= 80% on new code (SENG 34213 s6.4)
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
    },
  },
});
