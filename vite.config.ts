/// <reference types="vitest" />
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
// Some settings taken as recommended from here: https://github.com/tauri-apps/tauri/issues/2794#issuecomment-1055285894
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    strictPort: true,
  },
  clearScreen: false,
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
    clearMocks: true,
    hookTimeout: 30000,
    testTimeout: 30000,
    // Seems to help reduce test flakiness
    fileParallelism: false,
  },
});
