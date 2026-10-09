/// <reference types="vitest/config" />
import http from 'node:http'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

function rewriteSetCookie(proxyRes: IncomingMessage) {
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
}

function configureApiProxy(proxy: Parameters<NonNullable<ProxyOptions['configure']>>[0]) {
  proxy.on('proxyRes', (proxyRes) => {
    rewriteSetCookie(proxyRes)
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

/**
 * Pipe Transmit SSE without http-proxy buffering (breaks LAN clients).
 * Subscribe/unsubscribe still use the normal Vite proxy below.
 */
function transmitEventsProxyPlugin(apiUrl: string) {
  const target = new URL(apiUrl)

  return {
    name: 'nega-pos-transmit-events-proxy',
    configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
      server.middlewares.use(
        (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
          const url = req.url ?? ''
          if (!url.startsWith('/__transmit/events')) {
            next()
            return
          }

          const upstream = http.request(
            {
              hostname: target.hostname,
              port: target.port || 80,
              path: url,
              method: req.method,
              headers: {
                ...req.headers,
                host: target.host,
                connection: 'keep-alive',
                accept: 'text/event-stream',
              },
            },
            (upstreamRes) => {
              rewriteSetCookie(upstreamRes)
              const headers = { ...upstreamRes.headers }
              delete headers['content-length']
              headers['cache-control'] = 'no-cache, no-transform'
              headers['x-accel-buffering'] = 'no'
              headers.connection = 'keep-alive'
              res.writeHead(upstreamRes.statusCode ?? 502, headers)
              upstreamRes.pipe(res)
            }
          )

          upstream.on('error', (error) => {
            console.error('[nega-pos] Proxy SSE __transmit/events → API:', error.message)
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
              res.end(
                JSON.stringify({
                  error: {
                    code: 'API_PROXY_ERROR',
                    message: 'No se pudo abrir el stream realtime con la API.',
                  },
                })
              )
            } else {
              res.end()
            }
          })

          req.pipe(upstream)
        }
      )
    },
  }
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

  if (!env.VITE_API_URL) {
    console.warn(
      '[nega-pos] VITE_API_URL no está en apps/web/.env — proxy usa http://localhost:3333 por defecto.'
    )
  } else if (
    mode === 'development' &&
    (/railway\.app/i.test(apiUrl) || /nega-pos-api-production/i.test(apiUrl))
  ) {
    console.error(
      `[nega-pos] VITE_API_URL apunta a producción (${apiUrl}). Usá http://localhost:3333 para dev.`
    )
  } else {
    console.log(`[nega-pos] Proxy /api → ${apiUrl}`)
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiHealthCheckPlugin(apiUrl),
      transmitEventsProxyPlugin(apiUrl),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // true = 0.0.0.0 — otras PCs en la LAN pueden abrir http://<IP-servidor>:5173
      host: true,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          timeout: 30_000,
          proxyTimeout: 30_000,
          configure: configureApiProxy,
        },
        // subscribe / unsubscribe (short POSTs). Events use the middleware above.
        '/__transmit': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          timeout: 0,
          proxyTimeout: 0,
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
