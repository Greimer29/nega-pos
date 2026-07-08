import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { canAccess, canAccessNav, type PermissionKey } from '@/features/permissions/catalog'
import { ForbiddenPage } from '@/pages/forbidden-page'

function AuthLoadingScreen() {
  return (
    <div className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
      Cargando sesión…
    </div>
  )
}

function SessionBootstrapErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground max-w-sm text-sm">
        No se pudo verificar tu sesión. Revisá la conexión e intentá de nuevo.
      </p>
      <Button type="button" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, sessionBootstrapError, retryBootstrap } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (sessionBootstrapError) {
    return <SessionBootstrapErrorScreen onRetry={() => void retryBootstrap()} />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, sessionBootstrapError, retryBootstrap } = useAuth()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (sessionBootstrapError) {
    return <SessionBootstrapErrorScreen onRetry={() => void retryBootstrap()} />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export function PermissionRoute({
  children,
  permission,
  navPath,
}: {
  children: React.ReactNode
  permission?: PermissionKey
  navPath?: string
}) {
  const { user, isLoading, isAuthenticated, sessionBootstrapError, retryBootstrap } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (sessionBootstrapError) {
    return <SessionBootstrapErrorScreen onRetry={() => void retryBootstrap()} />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const allowed = permission
    ? canAccess(user?.role, user?.permissions, permission)
    : navPath
      ? canAccessNav(user?.role, user?.permissions, navPath)
      : true

  if (!allowed) {
    return <ForbiddenPage />
  }

  return children
}
