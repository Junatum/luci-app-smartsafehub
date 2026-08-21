import { fileURLToPath, URL } from 'node:url';

import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const outputDirectory = fileURLToPath(
  new URL('../root/www/luci-static/smartsafehub/', import.meta.url),
);

export default defineConfig({
  base: '/luci-static/smartsafehub/',
  plugins: [preact(), tailwindcss()],
  build: {
    target: 'es2020',
    outDir: outputDirectory,
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    reportCompressedSize: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/main.tsx', import.meta.url)),
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css')
            ? 'app.css'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
