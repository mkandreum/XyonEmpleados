import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    build: {
      // Generate source maps for production debugging
      sourcemap: false,
      // Ensure file names include content hash for cache busting
      rollupOptions: {
        output: {
          // Add hash to chunk names for better cache busting
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },
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
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        workbox: {
          // Clean up old caches
          cleanupOutdatedCaches: true,
          // Skip waiting and claim clients immediately for faster updates
          skipWaiting: true,
          clientsClaim: true,
          // Only precache JS, CSS, and font assets - NOT HTML
          globPatterns: ['**/*.{js,css,woff,woff2,ttf,otf}'],
          // NEVER cache navigation (HTML) - session guard in index.html must always run fresh
          navigateFallback: null,
          // Runtime caching strategies
          runtimeCaching: [
            {
              // Navigation requests: ALWAYS network (index.html has session guard)
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'navigation-cache',
                expiration: {
                  maxEntries: 1,
                  maxAgeSeconds: 60 * 5, // 5 minutes max
                },
                networkTimeoutSeconds: 3,
              },
            },
            {
              // Cache API responses with network-first strategy
              urlPattern: /^https:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5, // 5 minutes
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Cache images with cache-first strategy
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              // Cache fonts with cache-first strategy
              urlPattern: /\.(?:woff|woff2|ttf|otf)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Xyon Empleados',
          short_name: 'Xyon',
          description: 'Portal del Empleado - Gestión de Fichajes y Vacaciones',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
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
