import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: true,
    // Keep the browser's Host so Django's CSRF origin check sees the same origin the page uses.
    proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false } },
    // Shared brand assets (logo, Inter) live at the repository root; nothing else outside frontend/ is served.
    fs: { allow: ['.', fileURLToPath(new URL('../assets', import.meta.url))] },
  },
});
