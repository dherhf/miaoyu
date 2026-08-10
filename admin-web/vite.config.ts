import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";


export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  envDir: '../',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true
      }
    }
  }
})