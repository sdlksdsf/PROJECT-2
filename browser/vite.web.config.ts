import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Standalone build of the Kimmino UI.
 *
 * `npm run dev:ui` serves the exact same React chrome in a normal browser with a
 * mock bridge, so the interface can be previewed, reviewed and screenshotted
 * without packaging the native app. `npm run build:ui` produces a static bundle
 * that the website embeds as a live demo.
 */
export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  define: {
    __KIMMINO_PREVIEW__: 'true'
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: false,
    allowedHosts: true,
    cors: true
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true
  },
  build: {
    outDir: path.resolve(__dirname, 'out/web'),
    emptyOutDir: true
  }
});
