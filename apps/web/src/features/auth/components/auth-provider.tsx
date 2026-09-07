import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'
import { AuthContext } from '@/features/auth/auth-context'
import * as authService from '@/features/auth/services/auth-service'
import { clearVentasCartDraft } from '@/features/ventas/utils/ventas-cart-draft'
import { canAccess, type PermissionKey } from '@/features/permissions/catalog'
import { refreshCsrfToken, setUnauthorizedHandler } from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import type { AuthCompany, User } from '@/types/auth'

const SESSION_KEEPALIVE_MS = 25 * 60 * 1000
const SESSION_VISIBILITY_MIN_MS = 5 * 60 * 1000

function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}

function isApiUnreachableError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      error.response?.status === 500 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504)
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<AuthCompany | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionBootstrapError, setSessionBootstrapError] = useState(false)

  const permissions = user?.permissions ?? []

  const can = useCallback(
    (permission: PermissionKey) => canAccess(user?.role, permissions, permission),
    [permissions, user?.role]
  )

  const canAny = useCallback(
    (...keys: PermissionKey[]) => keys.some((permission) => can(permission)),
    [can]
  )

  const logSessionError = useCallback((error: unknown) => {
    if (!isUnauthorizedError(error) && !isApiUnreachableError(error) && import.meta.env.DEV) {
      console.error('No se pudo cargar la sesión', error)
    }
  }, [])

  const clearSession = useCallback(() => {
    setUser(null)
    setCompany(null)
  }, [])

  const applySessionFailure = useCallback(
    (error: unknown, options?: { bootstrap?: boolean }) => {
      logSessionError(error)

      if (isUnauthorizedError(error)) {
        queryClient.clear()
        clearSession()
        setSessionBootstrapError(false)
        return
      }

      if (options?.bootstrap) {
        setSessionBootstrapError(true)
      }
    },
    [clearSession, logSessionError]
  )

  const fetchCurrentUser = useCallback(async () => {
    const session = await authService.getCurrentUser()
    // No refrescar CSRF aquí: /auth/me es GET y la cookie XSRF ya suele existir.
    // El interceptor pide CSRF solo en el primer POST/PUT si hace falta.
    setUser(session.user)
    setCompany(session.company)
    setSessionBootstrapError(false)
    return session
  }, [])

  const loadUser = useCallback(async () => {
    setIsLoading(true)
    setSessionBootstrapError(false)

    try {
      await fetchCurrentUser()
    } catch (error) {
      applySessionFailure(error, { bootstrap: true })
    } finally {
      setIsLoading(false)
    }
  }, [applySessionFailure, fetchCurrentUser])

  const retryBootstrap = useCallback(async () => {
    setIsLoading(true)
    setSessionBootstrapError(false)

    try {
      await fetchCurrentUser()
    } catch (error) {
      applySessionFailure(error, { bootstrap: true })
    } finally {
      setIsLoading(false)
    }
  }, [applySessionFailure, fetchCurrentUser])

  const dismissBootstrapError = useCallback(() => {
    setSessionBootstrapError(false)
    clearSession()
  }, [clearSession])

  const revalidateSession = useCallback(async () => {
    try {
      await fetchCurrentUser()
    } catch (error) {
      applySessionFailure(error)
    }
  }, [applySessionFailure, fetchCurrentUser])

  useEffect(() => {
    // Platform uses its own session (/platform/*). Skip tenant /auth/me bootstrap
    // so a missing railway.users table never blocks the super-admin UI.
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/platform')) {
      setIsLoading(false)
      clearSession()
      setSessionBootstrapError(false)
      return
    }

    void loadUser()
  }, [clearSession, loadUser])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionBootstrapError(false)
      queryClient.clear()
      clearSession()
    })

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [clearSession])

  useEffect(() => {
    if (!user) {
      return
    }

    let lastCheckAt = Date.now()

    const intervalId = window.setInterval(() => {
      lastCheckAt = Date.now()
      void revalidateSession()
    }, SESSION_KEEPALIVE_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      // Evita un /auth/me en cada cambio de pestaña (suma latencia Railway).
      if (Date.now() - lastCheckAt < SESSION_VISIBILITY_MIN_MS) {
        return
      }
      lastCheckAt = Date.now()
      void revalidateSession()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, revalidateSession])

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login({ email, password })
    // Tras login la sesión/cookies cambian: renovar CSRF una sola vez.
    await refreshCsrfToken()
    setSessionBootstrapError(false)
    setUser(session.user)
    setCompany(session.company)
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const session = await authService.loginWithGoogle(idToken)
    await refreshCsrfToken()
    setSessionBootstrapError(false)
    setUser(session.user)
    setCompany(session.company)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      clearVentasCartDraft()
      setSessionBootstrapError(false)
      queryClient.clear()
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      user,
      company,
      permissions,
      isLoading,
      isAuthenticated: user !== null,
      sessionBootstrapError,
      retryBootstrap,
      dismissBootstrapError,
      can,
      canAny,
      login,
      loginWithGoogle,
      logout,
    }),
    [
      user,
      company,
      permissions,
      isLoading,
      sessionBootstrapError,
      retryBootstrap,
      dismissBootstrapError,
      can,
      canAny,
      login,
      loginWithGoogle,
      logout,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
