import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import path from 'node:path';

/** Short commit for startup diagnostics: CI sets GITHUB_SHA, local builds ask git. */
function buildCommit(): string {
  const fromCi = process.env.GITHUB_SHA?.slice(0, 7);
  if (fromCi) return fromCi;
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const commit = buildCommit();

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: { __KIMMINO_COMMIT__: JSON.stringify(commit) },
    build: {
      outDir: 'out/main',
      rollupOptions: { input: { index: path.resolve(__dirname, 'src/main/index.ts') } }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/preload/index.ts'),
          tab: path.resolve(__dirname, 'src/preload/tab.ts')
        },
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  renderer: {
    root: path.resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer/src'),
        '@shared': path.resolve(__dirname, 'src/shared')
      }
    },
    build: {
      outDir: path.resolve(__dirname, 'out/renderer'),
      rollupOptions: { input: { index: path.resolve(__dirname, 'src/renderer/index.html') } }
    }
  }
});
