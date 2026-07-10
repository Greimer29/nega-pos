import { Loader2, LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DisplayCurrencyToggle } from '@/features/currencies/components/display-currency-toggle'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useAppRefresh } from '@/lib/use-app-refresh'

export function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { refresh, isRefreshing } = useAppRefresh()

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-3">
        <p className="text-muted-foreground text-sm">Gestión comercial</p>
        <DisplayCurrencyToggle />
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          title="Reconectar con el servidor"
          aria-label="Reconectar con el servidor"
          disabled={isRefreshing}
          onClick={() => void refresh()}
        >
          {isRefreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
        {user ? (
          <p className="hidden text-sm sm:block">
            <span className="text-muted-foreground">Hola, </span>
            <span className="font-medium">{user.name}</span>
          </p>
        ) : null}
        <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
          <LogOut className="size-4" />
          Salir
        </Button>
      </div>
    </header>
  )
}
