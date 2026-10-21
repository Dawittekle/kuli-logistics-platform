import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html')
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5175
  },
  preview: {
    host: '0.0.0.0',
    port: 4175
  }
});
