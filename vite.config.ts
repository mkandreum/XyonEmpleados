import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [
      react(),
      react(),
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      //   manifest: {
      //     name: 'Xyon Empleados',
      //     short_name: 'Xyon',
      //     description: 'Portal del Empleado - Gestión de Fichajes y Vacaciones',
      //     theme_color: '#ffffff',
      //     icons: [
      //       {
      //         src: 'pwa-192x192.png',
      //         sizes: '192x192',
      //         type: 'image/png'
      //       },
      //       {
      //         src: 'pwa-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png'
      //       }
      //     ]
      //   }
      // })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
