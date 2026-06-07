/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import netlify from '@netlify/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    netlify(),
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
    environment: 'node',
  },
});
