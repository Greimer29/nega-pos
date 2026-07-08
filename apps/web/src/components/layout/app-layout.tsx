import { RoutePermissionOutlet } from '@/components/auth/route-permission-outlet'
import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { DisplayCurrencyProvider } from '@/features/currencies/context/display-currency-context'

export function AppLayout() {
  return (
    <DisplayCurrencyProvider>
      <div className="flex h-svh w-full overflow-hidden">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <RoutePermissionOutlet />
          </main>
        </div>
      </div>
    </DisplayCurrencyProvider>
  )
}
