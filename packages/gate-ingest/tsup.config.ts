import { defineConfig } from 'tsup';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: true,
    treeshake: true,
    platform: 'node',
    external: ['@mdream/js'],
  },
  {
    entry: {
      'index.browser': 'src/index.ts'
    },
    format: ['esm'],
    dts: true,
    clean: false,
    sourcemap: true,
    minify: true,
    treeshake: true,
    platform: 'browser',
    noExternal: ['@mdream/js'],
    define: {
      'process.versions.node': 'undefined',
      'process.platform': '"browser"',
    },
    esbuildOptions(options) {
      options.alias = {
        'fs': path.resolve(__dirname, 'src/platform/empty-shim.ts'),
        'path': path.resolve(__dirname, 'src/platform/empty-shim.ts'),
        'url': path.resolve(__dirname, 'src/platform/empty-shim.ts'),
        'crypto': path.resolve(__dirname, 'src/platform/empty-shim.ts'),
        'os': path.resolve(__dirname, 'src/platform/empty-shim.ts'),
        'stream': path.resolve(__dirname, 'src/platform/empty-shim.ts'),
        'worker_threads': path.resolve(__dirname, 'src/platform/empty-shim.ts'),
        'fs/promises': path.resolve(__dirname, 'src/platform/empty-shim.ts'),
      }
    }
  }
]);
