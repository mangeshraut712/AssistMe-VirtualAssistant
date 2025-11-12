import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  build: {
    manifest: true,
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    outDir: '../dist',
    emptyOutDir: true,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['marked', 'highlight.js']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600,
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
    include: ['marked', 'highlight.js'],
    exclude: ['katex']
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none'
  }
})
