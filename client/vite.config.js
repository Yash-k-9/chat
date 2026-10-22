import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const target = process.env.API_PROXY_TARGET || 'http://localhost:3000';

// The same strict Content-Security-Policy as production (vercel.json), so `npm run preview`
// tests the real thing. Here the API is same-origin (proxied), so connect-src is just 'self'.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'", // libsodium is WebAssembly
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Dev proxy: the browser calls /api on :5173 and Vite forwards it to the server.
    // Same origin in the browser = no CORS problems and cookies "just work" in dev.
    proxy: {
      // API_PROXY_TARGET lets you point the client at a server on another port.
      '/api': target,
      // Socket.IO: ws: true also forwards the WebSocket upgrade.
      '/socket.io': { target, ws: true },
    },
  },
  preview: {
    port: 4173,
    headers: { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
  },
});
