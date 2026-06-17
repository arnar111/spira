import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import netlify from '@netlify/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    netlify(),
    // Bundle-kort (5.4): `$env:ANALYZE='1'; npm run build` skrifar dist/stats.html.
    ...(process.env.ANALYZE
      ? [visualizer({ filename: 'dist/stats.html', gzipSize: true })]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      // Eitt manifest: við höldum public/manifest.webmanifest + <link> í
      // index.html. `manifest: false` lætur plugin-ið NOT búa til annað.
      manifest: false,
      includeAssets: [
        'leaf.svg',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-maskable-512.png',
      ],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Bundle-kortið (ANALYZE-byggingar) á aldrei heima í precache.
        globIgnores: ['**/stats.html'],
        navigateFallback: '/index.html',
        // Aldrei láta SPA-fallback grípa API-köll.
        navigateFallbackDenylist: [/^\/api\//],
        // Aldrei vista /api/* í cache — alltaf beint á netið.
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/[^/]+\/api\//,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: /^https?:\/\/[^/]+\/api\//,
            handler: 'NetworkOnly',
            method: 'POST',
          },
        ],
      },
      // Við sjáum sjálf um skráningu í main.tsx (draugur-SW hreinsun +
      // localStorage rofi). Slökkvum á sjálfvirkri innspýtingu plugin-sins.
      injectRegister: null,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    // Multi-project setup: 'node' fyrir hreinar kjarnaeiningar, 'jsdom' fyrir
    // React-íhluti. Playwright e2e eru EKKI hluti af þessum keyrslu.
    projects: [
      {
        // ---------------------------------------------------------------
        // node — hreinar einingar, Dexie (fake-indexeddb), rök o.fl.
        // Sama hegðun og áður — öll *.test.ts skrár í src/lib/.
        // ---------------------------------------------------------------
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: [...configDefaults.exclude, '**/.claude/**'],
        },
        resolve: {
          alias: { '@': path.resolve(__dirname, './src') },
        },
      },
      {
        // ---------------------------------------------------------------
        // jsdom — React-íhluta próf (*.test.tsx).
        // Setup-skrá sér um jest-dom matchers og cleanup afterEach.
        // ---------------------------------------------------------------
        plugins: [react()],
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          // globals: true needed so @testing-library/jest-dom can extend
          // the global `expect` when the setup file imports it.
          globals: true,
          include: ['src/**/*.test.tsx'],
          exclude: [...configDefaults.exclude, '**/.claude/**'],
          setupFiles: ['src/test/setup.ts'],
        },
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
          },
        },
      },
    ],
  },
});
