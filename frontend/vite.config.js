import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mediapipe: [
            '@mediapipe/pose', 
            '@mediapipe/camera_utils', 
            '@mediapipe/drawing_utils',
            '@mediapipe/control_utils'
          ],
          ui: ['framer-motion', '@headlessui/react', 'lucide-react']
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: [
      '@mediapipe/pose', 
      '@mediapipe/camera_utils', 
      '@mediapipe/drawing_utils',
      '@mediapipe/control_utils',
      'react-router-dom',
      'framer-motion'
    ]
  },
  define: {
    'process.env': {}
  }
})
