import { Loader2, LogOut, RefreshCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DisplayCurrencyToggle } from '@/features/currencies/components/display-currency-toggle'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useBusinessProfileQuery } from '@/features/branding/business-theme-provider'
import { useAppRefresh } from '@/lib/use-app-refresh'

type AppHeaderProps = {
  leading?: ReactNode
}

export function AppHeader({ leading }: AppHeaderProps) {
  const { user, company, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { refresh, isRefreshing } = useAppRefresh()
  const { data: profile } = useBusinessProfileQuery(isAuthenticated)

  const companyName =
    profile?.trade_name?.trim() ||
    company?.name?.trim() ||
    company?.slug?.trim() ||
    null

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
    <header className="flex h-14 min-w-0 shrink-0 items-center justify-between gap-2 overflow-hidden border-b px-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {leading}
        {companyName ? (
          <p
            className="max-w-[9rem] truncate text-[13px] leading-tight font-semibold tracking-[-0.01em] text-foreground sm:max-w-[14rem] lg:max-w-[22rem] xl:max-w-[32rem]"
            title={companyName}
          >
            {companyName}
          </p>
        ) : null}
        <DisplayCurrencyToggle className="shrink-0" />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
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
          <p className="hidden min-w-0 truncate text-sm xl:block">
            <span className="text-muted-foreground">Hola, </span>
            <span className="font-medium">{user.name}</span>
          </p>
        ) : null}
        <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
          <LogOut className="size-4" />
          <span className="hidden lg:inline">Salir</span>
        </Button>
      </div>
    </header>
  )
}
