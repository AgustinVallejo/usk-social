import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages - set to '/' for local development
  // Change to '/usk-social/' when deploying to GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/usk-social/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

