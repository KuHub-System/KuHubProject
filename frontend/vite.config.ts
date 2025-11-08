import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  build: {
    // Optimizaciones de build
    rollupOptions: {
      output: {
        // Code splitting manual para mejor caché
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@heroui/react', '@heroui/use-theme'],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['axios', 'framer-motion'],
        },
      },
    },
    // Límite de tamaño de chunk
    chunkSizeWarningLimit: 1000,
    // Minificación
    minify: 'esbuild',
    // Source maps solo en desarrollo
    sourcemap: false, // Desactivado en producción para mejor rendimiento
    // Optimización de assets
    assetsInlineLimit: 4096,
  },
  // Optimización de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@heroui/react',
      'axios',
    ],
  },
});