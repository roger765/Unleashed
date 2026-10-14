import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    // The preview harness assigns a free port via PORT; fall back to Vite's default otherwise.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    open: true,
  },
});
