import axios from 'axios'

let apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
let cachedCsrfToken: string | null = null
let csrfBootstrapPromise: Promise<string | null> | null = null
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export const api = axios.create({
  withCredentials: true,
  maxRedirects: 0,
  // Railway remoto: evita colgarse indefinidamente al guardar settings.
  timeout: 45_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

function usesLocalApiProxy(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (import.meta.env.DEV) {
    return true
  }

  return window.location.port === '51740'
}

function resolveApiBasePath(): string {
  if (usesLocalApiProxy()) {
    return '/api/v1'
  }

  return `${apiBaseUrl.replace(/\/$/, '')}/api/v1`
}

function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function isCrossOriginApi(): boolean {
  if (usesLocalApiProxy()) {
    return false
  }

  if (typeof window === 'undefined') {
    return false
  }

  try {
    const apiOrigin = new URL(apiBaseUrl.replace(/\/$/, '')).origin
    return apiOrigin !== window.location.origin
  } catch {
    return false
  }
}

async function fetchCsrfTokenFromApi(): Promise<string | null> {
  const { data } = await api.get<{ data: { csrf_token: string | null } }>('/csrf', {
    baseURL: resolveApiBasePath(),
  })

  return data.data.csrf_token
}

export async function ensureCsrfToken(): Promise<void> {
  if (getCsrfTokenFromCookie()) {
    return
  }

  if (cachedCsrfToken) {
    return
  }

  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = fetchCsrfTokenFromApi()
      .then((token) => {
        cachedCsrfToken = token
        return token
      })
      .catch(() => {
        cachedCsrfToken = null
        return null
      })
      .finally(() => {
        csrfBootstrapPromise = null
      })
  }

  await csrfBootstrapPromise
}

export async function refreshCsrfToken(): Promise<void> {
  cachedCsrfToken = null
  csrfBootstrapPromise = null

  // Si la cookie ya está, no hace falta otro RTT a /csrf.
  if (getCsrfTokenFromCookie()) {
    return
  }

  try {
    const token = await fetchCsrfTokenFromApi()
    cachedCsrfToken = token
  } catch {
    cachedCsrfToken = null
  }
}

function applyCsrfHeader(config: import('axios').InternalAxiosRequestConfig) {
  const cookieToken = getCsrfTokenFromCookie()
  if (cookieToken) {
    config.headers.set('X-XSRF-TOKEN', cookieToken)
    return
  }

  if (cachedCsrfToken) {
    config.headers.set('X-CSRF-TOKEN', cachedCsrfToken)
  }
}

api.interceptors.request.use(async (config) => {
  config.baseURL = resolveApiBasePath()

  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }

  const method = config.method?.toUpperCase()
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    await ensureCsrfToken()
    applyCsrfHeader(config)
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config) {
      const requestUrl = error.config.url ?? ''
      const isAuthBootstrap =
        requestUrl.includes('/auth/login') || requestUrl.includes('/auth/me')

      if (!isAuthBootstrap) {
        queueMicrotask(() => unauthorizedHandler?.())
      }
    }

    if (!axios.isAxiosError(error) || !error.config || error.response?.status !== 403) {
      throw error
    }

    const code = (error.response.data as { error?: { code?: string } } | undefined)?.error?.code
    if (code !== 'CSRF_TOKEN_MISMATCH' || error.config.headers.get('X-Retry-Csrf')) {
      throw error
    }

    await refreshCsrfToken()
    error.config.headers.set('X-Retry-Csrf', '1')
    applyCsrfHeader(error.config)

    return api.request(error.config)
  }
)

export function configureApiBaseUrl(url: string) {
  apiBaseUrl = url.replace(/\/$/, '')
  cachedCsrfToken = null
  csrfBootstrapPromise = null
}

export async function loadRuntimeApiConfig(): Promise<void> {
  try {
    const response = await fetch('/runtime-config.json', { credentials: 'same-origin' })
    if (response.ok) {
      const config = (await response.json()) as { apiUrl?: string; useLocalApiProxy?: boolean }
      if (config.apiUrl && !config.useLocalApiProxy && !usesLocalApiProxy()) {
        configureApiBaseUrl(config.apiUrl)
        return
      }
    }
  } catch {
    // Web local o build sin runtime-config: continuar con fallbacks.
  }

  if (typeof window !== 'undefined' && window.location.port === '51740') {
    configureApiBaseUrl('')
  }
}

export function getApiBaseUrl() {
  return apiBaseUrl
}

export function getApiV1BaseUrl(): string {
  if (usesLocalApiProxy() && typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1`
  }

  const base = apiBaseUrl.replace(/\/$/, '')
  if (!base) {
    throw new Error('VITE_API_URL no configurada. Definila en apps/web/.env o .env.local.')
  }
  return `${base}/api/v1`
}

export function resolvePublicAssetUrl(assetPath: string): string {
  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return `${getApiV1BaseUrl()}${normalizedPath}`
}

export function isApiCrossOrigin() {
  return isCrossOriginApi()
}
