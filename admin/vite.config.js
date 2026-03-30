import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    rollupOptions: {
      input: 'src/index.html'
    }
  }
})
