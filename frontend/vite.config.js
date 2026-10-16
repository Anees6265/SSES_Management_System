import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'face-api.js': fileURLToPath(new URL('./node_modules/face-api.js/dist/face-api.min.js', import.meta.url))
    }
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    open: true,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
});
