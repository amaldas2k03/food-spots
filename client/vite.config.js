import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const require = createRequire(import.meta.url);

/**
 * maplibre-gl resolves its tile-parsing worker at runtime as a sibling of its
 * own bundle — `new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Rollup
 * can't see through that, so the file is never emitted and the worker 404s in a
 * production build: the basemap paints its background colour and no vector
 * features ever render. Emit the worker, plus the shared chunk it imports,
 * alongside the entry chunk so both resolve.
 */
function maplibreWorkerAssets() {
  return {
    name: 'maplibre-worker-assets',
    apply: 'build',
    generateBundle() {
      for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${file}`,
          source: readFileSync(require.resolve(`maplibre-gl/dist/${file}`)),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), maplibreWorkerAssets()],
  // maplibre-gl spawns its tile-parsing worker from a URL next to its own
  // bundle. Pre-bundling into .vite/deps leaves that worker file behind, so the
  // worker 404s and vector tiles never get parsed — the map renders as a bare
  // background colour. Serving the package from its real path keeps them together.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  server: {
    // 5173 by default; PORT lets a harness or a second checkout run alongside
    // an existing dev server. The /api proxy below means the client's port is
    // never baked into a CORS origin, so moving it is safe.
    port: Number(process.env.PORT) || 5173,
    // Lets the client call /api/... directly without CORS or a base URL in dev.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
