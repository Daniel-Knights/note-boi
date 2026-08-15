import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import { defineConfig, Plugin } from 'vite';

import { SERVER_URL_PROD } from './vite.config.ts';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [vue(), pwaPlugin],
  publicDir: './public',
  server: {
    port: 3000,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    outDir: './dist-web',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
  },
  define: {
    'process.env.APP_ENV': "'web'",
    'process.env.SERVER_URL':
      mode === 'production' ? `"${SERVER_URL_PROD}"` : '"http://localhost:8000"',
  },
}));

// Injects build output filenames into sw.js for PWA caching
const pwaPlugin = {
  name: 'pwa',
  async writeBundle() {
    // Get all built files
    const outFiles = await fs.promises.readdir('./dist-web', { recursive: true });
    const sw = await fs.promises.readFile('./dist-web/sw.js', 'utf-8');
    const excludeFiles = ['sw.js', 'assets'];

    // Format as list of paths for service worker cache manifest
    const injectFilenames = outFiles
      .filter((f) => !excludeFiles.includes(f))
      .concat('') // Root
      .map((f) => `"/${f}"`)
      .join(',\n');

    // Replace placeholder in sw.js
    await fs.promises.writeFile(
      './dist-web/sw.js',
      sw.replace('/* <INJECTED> */', injectFilenames)
    );
  },
} satisfies Plugin;
