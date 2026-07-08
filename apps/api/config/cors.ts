import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

function expandLocalhostTwin(origin: string): string[] {
  try {
    const url = new URL(origin)
    const port = url.port ? `:${url.port}` : ''

    if (url.hostname === 'localhost') {
      return [`${url.protocol}//127.0.0.1${port}`]
    }

    if (url.hostname === '127.0.0.1') {
      return [`${url.protocol}//localhost${port}`]
    }
  } catch {
    // Ignorar valores que no sean URLs válidas.
  }

  return []
}

function frontendOrigins(): string[] {
  const origins = new Set<string>([env.get('FRONTEND_URL')])
  const desktopOrigin = env.get('DESKTOP_APP_ORIGIN')

  if (desktopOrigin) {
    origins.add(desktopOrigin)
  }

  // Solo en desarrollo: evita errores CORS al alternar localhost / 127.0.0.1.
  if (!app.inProduction) {
    for (const origin of [...origins]) {
      for (const twin of expandLocalhostTwin(origin)) {
        origins.add(twin)
      }
    }
  }

  return [...origins]
}

const corsConfig = defineConfig({
  enabled: true,
  origin: frontendOrigins(),
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
