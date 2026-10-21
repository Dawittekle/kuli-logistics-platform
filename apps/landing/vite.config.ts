import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = typeof import.meta.dirname !== 'undefined'
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        verifyOtp: resolve(__dirname, 'verify-otp.html')
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
