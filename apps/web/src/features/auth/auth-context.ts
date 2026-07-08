import { createContext } from 'react'
import type { PermissionKey } from '@/features/permissions/catalog'
import type { User } from '@/types/auth'

export type AuthContextValue = {
  user: User | null
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
  sessionBootstrapError: boolean
  retryBootstrap: () => Promise<void>
  can: (permission: PermissionKey) => boolean
  canAny: (...permissions: PermissionKey[]) => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
