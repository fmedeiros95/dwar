import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Portas próprias para partidas de teste (scripts/demo-caravana.mjs); sem elas, as de sempre.
const { WEB_PORT = '5180', API_PORT = '3100' } = process.env;
const target = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(WEB_PORT),
    strictPort: true,
    proxy: {
      '/api': { target, changeOrigin: false },
      '/avatars': { target, changeOrigin: false },
    },
  },
});
