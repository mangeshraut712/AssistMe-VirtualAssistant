import { copyFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function githubPagesStatic() {
  return {
    name: 'github-pages-static',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist')
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
      writeFileSync(resolve(outDir, '.nojekyll'), '')
    },
  }
}

export default defineConfig({
  base: '/AssistMe-VirtualAssistant/',
  plugins: [react(), githubPagesStatic()],
  root: resolve(__dirname, '.'),
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@modules': resolve(__dirname, './modules'),
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
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
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

