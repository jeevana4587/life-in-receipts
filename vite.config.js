import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Vite 8 uses Rolldown, whose equivalent of manualChunks is
        // advancedChunks. Splitting stable vendor libraries into their own
        // chunk gives returning visitors strong browser-cache hits and keeps
        // the entry bundle small (Efficiency: fast FCP).
        advancedChunks: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
})