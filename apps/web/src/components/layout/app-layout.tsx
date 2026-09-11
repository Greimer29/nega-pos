import { useState } from 'react'
import { RoutePermissionOutlet } from '@/components/auth/route-permission-outlet'
import { AppHeader } from '@/components/layout/app-header'
import { AppMobileNav, AppMobileNavTrigger } from '@/components/layout/app-mobile-nav'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { DisplayCurrencyProvider } from '@/features/currencies/context/display-currency-context'

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <DisplayCurrencyProvider>
      <div className="flex h-svh w-full overflow-hidden">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader
            leading={<AppMobileNavTrigger onClick={() => setMobileNavOpen(true)} />}
          />
          <main className="@container min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
            <RoutePermissionOutlet />
          </main>
        </div>
      </div>
      <AppMobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </DisplayCurrencyProvider>
  )
}
