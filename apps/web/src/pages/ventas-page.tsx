import { useState } from 'react'
import { ProfitMarginLink } from '@/features/purchases/components/profit-margin-link'
import { VentasHistoryPanel } from '@/features/ventas/components/ventas-history-panel'
import { VentasPanel } from '@/features/ventas/components/ventas-panel'
import { cn } from '@/lib/utils'

type VentasTab = 'facturar' | 'historial'

export function VentasPage() {
  const [activeTab, setActiveTab] = useState<VentasTab>('facturar')

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-0 flex-col gap-4 overflow-hidden p-4 md:-m-6 md:h-[calc(100%+3rem)] md:p-6">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex gap-2">
          {(
            [
              { id: 'facturar' as const, label: 'Facturar' },
              { id: 'historial' as const, label: 'Historial' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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
        <ProfitMarginLink />
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
