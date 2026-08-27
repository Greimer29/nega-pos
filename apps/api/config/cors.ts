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

function addOriginWithLocalhostTwins(origins: Set<string>, origin: string | undefined) {
  if (!origin) {
    return
  }

  origins.add(origin)

  for (const twin of expandLocalhostTwin(origin)) {
    origins.add(twin)
  }
}

function frontendOrigins(): string[] {
  const origins = new Set<string>()

  addOriginWithLocalhostTwins(origins, env.get('FRONTEND_URL'))
  addOriginWithLocalhostTwins(origins, env.get('DESKTOP_APP_ORIGIN'))
  addOriginWithLocalhostTwins(origins, env.get('MOBILE_APP_ORIGIN'))

  // Capacitor Android (http scheme / iOS capacitor://) — orígenes fijos del WebView.
  origins.add('http://localhost')
  origins.add('capacitor://localhost')

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
