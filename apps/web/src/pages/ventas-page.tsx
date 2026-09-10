import { ProfitMarginLink } from '@/features/purchases/components/profit-margin-link'
import { RegisterExpenseButton } from '@/features/purchases/components/register-expense-button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { VentasHistoryPanel } from '@/features/ventas/components/ventas-history-panel'
import { VentasPanel } from '@/features/ventas/components/ventas-panel'
import { VentasShiftControls } from '@/features/ventas/components/ventas-shift-controls'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'

type VentasTab = 'facturar' | 'historial'

type VentasTabState = {
  activeTab: VentasTab
}

const DEFAULT_VENTAS_TAB: VentasTabState = {
  activeTab: 'facturar',
}

export function VentasPage() {
  const { company } = useAuth()
  const [tabState, setTabState] = useSessionPersistedState(
    sessionFilterKey('ventas-tab', company?.id),
    DEFAULT_VENTAS_TAB
  )
  const activeTab = tabState.activeTab

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-0 flex-col gap-4 overflow-hidden p-4 md:-m-6 md:h-[calc(100%+3rem)] md:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 gap-2">
          {(
            [
              { id: 'facturar' as const, label: 'Facturar' },
              { id: 'historial' as const, label: 'Historial' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabState({ activeTab: tab.id })}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <VentasShiftControls iconOnly="mobile" />
          <RegisterExpenseButton />
          <ProfitMarginLink />
        </div>
      </div>

      {activeTab === 'facturar' ? (
        <VentasPanel />
      ) : (
        <div className="min-h-0 flex-1">
          <VentasHistoryPanel />
        </div>
      )}
    </div>
  )
}
