/// <reference types="vitest" />

/* eslint-disable import/no-extraneous-dependencies */
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
  envPrefix: ['VITE_', 'TAURI_'],
  clearScreen: false,
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: "@use './src/sass/vars' as v;",
      },
    },
  },
  build: {
    // tauri supports es2021
    target: ['es2021', 'chrome97', 'safari13'],
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  esbuild: {
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
    clearMocks: true,
  },
});
