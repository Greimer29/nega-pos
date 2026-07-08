import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { canAccess, resolvePagePermission } from '@/features/permissions/catalog'
import { ForbiddenPage } from '@/pages/forbidden-page'

export function RoutePermissionOutlet() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const permission = resolvePagePermission(pathname)

  if (permission && !canAccess(user?.role, user?.permissions, permission)) {
    return <ForbiddenPage />
  }

  return <Outlet />
}
