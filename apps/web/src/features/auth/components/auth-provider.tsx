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
import { canAccess, type PermissionKey } from '@/features/permissions/catalog'
import { refreshCsrfToken, setUnauthorizedHandler } from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import type { User } from '@/types/auth'

const SESSION_KEEPALIVE_MS = 25 * 60 * 1000

function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}

function isApiUnreachableError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      error.response?.status === 500 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504)
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
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

  const applySessionFailure = useCallback(
    (error: unknown, options?: { bootstrap?: boolean }) => {
      logSessionError(error)

      if (isUnauthorizedError(error)) {
        queryClient.clear()
        setUser(null)
        setSessionBootstrapError(false)
        return
      }

      if (options?.bootstrap) {
        setSessionBootstrapError(true)
      }
    },
    [logSessionError]
  )

  const fetchCurrentUser = useCallback(async () => {
    const currentUser = await authService.getCurrentUser()
    await refreshCsrfToken()
    setUser(currentUser)
    setSessionBootstrapError(false)
    return currentUser
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

  const revalidateSession = useCallback(async () => {
    try {
      await fetchCurrentUser()
    } catch (error) {
      applySessionFailure(error)
    }
  }, [applySessionFailure, fetchCurrentUser])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionBootstrapError(false)
      queryClient.clear()
      setUser(null)
    })

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    const intervalId = window.setInterval(() => {
      void revalidateSession()
    }, SESSION_KEEPALIVE_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void revalidateSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, revalidateSession])

  const login = useCallback(async (email: string, password: string) => {
    const authenticatedUser = await authService.login({ email, password })
    await refreshCsrfToken()
    setSessionBootstrapError(false)
    setUser(authenticatedUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setSessionBootstrapError(false)
      queryClient.clear()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      permissions,
      isLoading,
      isAuthenticated: user !== null,
      sessionBootstrapError,
      retryBootstrap,
      can,
      canAny,
      login,
      logout,
    }),
    [
      user,
      permissions,
      isLoading,
      sessionBootstrapError,
      retryBootstrap,
      can,
      canAny,
      login,
      logout,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
