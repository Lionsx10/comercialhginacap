// Importaciones necesarias para la configuración de Vite
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Configuración de Vite para el proyecto Vue.js
// https://vitejs.dev/config/
export default defineConfig({
  // Plugins utilizados en el proyecto
  plugins: [vue()], // Plugin oficial de Vue.js para Vite

  // Configuración de resolución de módulos
  resolve: {
    alias: {
      // Alias '@' apunta a la carpeta src para imports más limpios
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // Configuración del servidor de desarrollo
  server: {
    host: 'localhost',
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Configuración de build para producción
  build: {
    outDir: 'dist', // Directorio de salida para archivos compilados
    sourcemap: true, // Genera sourcemaps para debugging en producción
  },
})
