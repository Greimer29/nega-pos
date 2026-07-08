import { useContext } from 'react'
import { AuthContext } from '@/features/auth/auth-context'

export { AuthProvider } from '@/features/auth/components/auth-provider'

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}
