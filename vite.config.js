import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, '.'),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    manifest: true,
    target: 'es2022',
    minify: 'terser',
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true,
    cssMinify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'marked', 'highlight.js'],
          motion: ['framer-motion'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1200,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      },
      format: {
        comments: false
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/health': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'marked', 'highlight.js', 'framer-motion'],
    exclude: ['katex']
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none'
  }
})

