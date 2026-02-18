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
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          // IMPORTANT: No precaching - we don't want the SW to cache HTML at all
          globPatterns: [],
          navigateFallback: null,
          // Enable navigation preload so navigations always hit the network
          navigationPreload: true,
          runtimeCaching: [
            {
              // ONLY cache hashed static assets (JS/CSS produced by Vite with content hash)
              // These are safe to cache long-term because the hash changes on every build
              urlPattern: /\/assets\/.*\.[a-f0-9]{8,}\.(js|css)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'hashed-assets',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            {
              // Cache fonts from Google Fonts
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
              },
            },
            {
              // Cache uploaded images (avatars, logos, news images)
              urlPattern: /\/uploads\/public\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'uploaded-images',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                },
              },
            },
            // CRITICAL: Do NOT cache HTML, API calls, or service worker files
            // Navigations (HTML) always go to the network, no fallback
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
