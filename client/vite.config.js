import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Dev proxy: the browser calls /api on :5173 and Vite forwards it to the server.
    // Same origin in the browser = no CORS problems and cookies "just work" in dev.
    proxy: {
      // API_PROXY_TARGET lets you point the client at a server on another port.
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:3000',
      // Socket.IO: ws: true also forwards the WebSocket upgrade.
      '/socket.io': { target: process.env.API_PROXY_TARGET || 'http://localhost:3000', ws: true },
    },
  },
});
