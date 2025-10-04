import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import { defineConfig, Plugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(() => ({
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
  esbuild: {
    define: {
      'process.env.APP_ENV': "'web'",
    },
  },
}));

const pwaPlugin = {
  name: 'pwa',
  async writeBundle() {
    const outFiles = await fs.promises.readdir('./dist-web', { recursive: true });
    const sw = await fs.promises.readFile('./dist-web/sw.js', 'utf-8');
    const excludeFiles = ['sw.js', 'assets'];

    const injectFilenames = outFiles
      .filter((f) => !excludeFiles.includes(f))
      .concat('') // Root
      .map((f) => `"/${f}"`)
      .join(',\n');

    await fs.promises.writeFile(
      './dist-web/sw.js',
      sw.replace('/* <INJECTED> */', injectFilenames)
    );
  },
} satisfies Plugin;
