import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type { PermissionKey } from '@/features/permissions/catalog'

type PermissionGateProps = {
  permission: PermissionKey
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can } = useAuth()

  if (!can(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function usePermission(permission: PermissionKey) {
  const { can } = useAuth()
  return can(permission)
}
