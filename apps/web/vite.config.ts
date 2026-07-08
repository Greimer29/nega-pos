/// <reference types="vitest/config" />
import path from 'node:path'
import type { ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

function configureApiProxy(proxy: Parameters<NonNullable<ProxyOptions['configure']>>[0]) {
  proxy.on('proxyRes', (proxyRes) => {
    const raw = proxyRes.headers['set-cookie']
    if (!raw) {
      return
    }

    proxyRes.headers['set-cookie'] = (Array.isArray(raw) ? raw : [raw]).map((cookie) =>
      cookie
        .replace(/;\s*Domain=[^;]*/gi, '')
        .replace(/;\s*Secure/gi, '')
        .replace(/;\s*SameSite=[^;]*/gi, '; SameSite=Lax')
    )
  })

  proxy.on('error', (error, _req, res) => {
    console.error('[nega-pos] Proxy /api → API:', error.message)
    const response = res as ServerResponse
    if (response && typeof response.writeHead === 'function' && !response.headersSent) {
      response.writeHead(502, { 'Content-Type': 'application/json' })
      response.end(
        JSON.stringify({
          error: {
            code: 'API_PROXY_ERROR',
            message:
              'No se pudo conectar con la API. Verificá VITE_API_URL en apps/web/.env y que el servicio esté online.',
          },
        })
      )
    }
  })
}
function apiHealthCheckPlugin(apiUrl: string) {
  return {
    name: 'nega-pos-api-health-check',
    configureServer() {
      const healthUrl = `${apiUrl.replace(/\/$/, '')}/health`
      void fetch(healthUrl)
        .then((response) => {
          if (response.ok) {
            console.log(`[nega-pos] API accesible: ${apiUrl}`)
            return
          }
          console.warn(
            `[nega-pos] API respondió ${response.status} en ${healthUrl}. Revisá VITE_API_URL.`
          )
        })
        .catch(() => {
          console.warn(
            `[nega-pos] No se pudo conectar con ${apiUrl}. Las peticiones a /api devolverán 502 hasta que la API esté disponible.`
          )
        })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3333'

  return {
    plugins: [react(), tailwindcss(), apiHealthCheckPlugin(apiUrl)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      host: 'localhost',
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
          timeout: 30_000,
          proxyTimeout: 30_000,
          configure: configureApiProxy,
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
