/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export const SERVER_URL_PROD =
  'https://note-boi-server-v4-1098279308841.europe-west2.run.app';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  server: {
    port: 3000,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  clearScreen: false,
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  define: {
    'process.env.APP_ENV': "'desktop'",
    'process.env.SERVER_URL':
      mode === 'production' ? `"${SERVER_URL_PROD}"` : '"http://localhost:8000"',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
    mockReset: true,
    hookTimeout: 30000,
    testTimeout: 30000,
    // Seems to help reduce test flakiness
    fileParallelism: false,
  },
}));
