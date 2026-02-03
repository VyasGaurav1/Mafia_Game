import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_')
  const rawBasePath = env.VITE_BASE_PATH || '/'
  const basePath = rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`

  return {
    base: normalizedBasePath,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@store': path.resolve(__dirname, './src/store'),
        '@types': path.resolve(__dirname, './src/types'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@assets': path.resolve(__dirname, './src/assets'),
      },
    },
    server: {
      port: 5173,
      allowedHosts: [
        'voting-immigration-transcripts-plug.trycloudflare.com',
        '.trycloudflare.com',
        'localhost'
      ],
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
