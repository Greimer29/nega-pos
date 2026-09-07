import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import * as platformService from '@/features/platform/services/platform-service'
import type { PlatformAdmin } from '@/features/platform/services/platform-service'
import { refreshCsrfToken } from '@/lib/api'

type PlatformAuthContextValue = {
  admin: PlatformAdmin | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null)

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const current = await platformService.getPlatformMe()
        setAdmin(current)
      } catch (error) {
        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          console.error(error)
        }
        setAdmin(null)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const value = useMemo<PlatformAuthContextValue>(
    () => ({
      admin,
      isLoading,
      isAuthenticated: admin !== null,
      login: async (email, password) => {
        const logged = await platformService.platformLogin(email, password)
        await refreshCsrfToken()
        setAdmin(logged)
      },
      logout: async () => {
        try {
          await platformService.platformLogout()
        } finally {
          setAdmin(null)
        }
      },
    }),
    [admin, isLoading]
  )

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext)
  if (!ctx) {
    throw new Error('usePlatformAuth debe usarse dentro de PlatformAuthProvider')
  }
  return ctx
}
