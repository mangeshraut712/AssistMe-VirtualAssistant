import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  build: {
    manifest: true,
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['marked', 'highlight.js']
        }
      }
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    include: ['marked', 'highlight.js'],
    exclude: ['katex']
  }
})
