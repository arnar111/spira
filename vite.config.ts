import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import netlify from '@netlify/vite-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), netlify()],
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
    // Teymis-worktrees liggja undir .claude/worktrees/ — án þessa myndi vitest
    // í aðal-checkoutinu líka keyra próf úr worktrees hinna (4.2 session log).
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
});
