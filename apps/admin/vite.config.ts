import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'ADMIN_APP_'],
  server: {
    host: '0.0.0.0',
    port: 5174
  },
  preview: {
    host: '0.0.0.0',
    port: 4174
  }
});
