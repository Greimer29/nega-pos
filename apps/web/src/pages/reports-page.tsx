import { BarChart3, CalendarDays, Package } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccountStatementPanel } from '@/features/reports/components/account-statement-panel'
import { InventoryReportPanel } from '@/features/reports/components/inventory-report-panel'
import { currentMonthIso, type ReportsHubTab } from '@/features/reports/constants'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

function currentPeriodLabel() {
  const [year, month] = currentMonthIso().split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function parseVista(value: string | null): ReportsHubTab {
  if (value === 'inventario') return 'inventario'
  return 'estado-cuenta'
}

const REPORT_VIEWS: Array<{
  id: ReportsHubTab
  label: string
  icon: ReactNode
}> = [
  {
    id: 'estado-cuenta',
    label: 'Reportes financieros',
    icon: <BarChart3 className="size-3.5 text-[#0d3d2e]" />,
  },
  {
    id: 'inventario',
    label: 'Reporte de inventario',
    icon: <Package className="size-3.5 text-[#0d3d2e]" />,
  },
]

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<ReportsHubTab>(() =>
    parseVista(searchParams.get('vista'))
  )

  useEffect(() => {
    setActiveTab(parseVista(searchParams.get('vista')))
  }, [searchParams])

  function handleTabChange(tab: ReportsHubTab) {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    if (tab === 'inventario') {
      next.set('vista', 'inventario')
    } else {
      next.delete('vista')
      for (const key of [...next.keys()]) {
        if (key.startsWith('inv_')) next.delete(key)
      }
    }
    setSearchParams(next, { replace: true })
  }

  const subtitle = useMemo(() => {
    if (activeTab === 'inventario') {
      return 'Stock actual de productos de catálogo y materiales, con filtros y exportación.'
    }
    return 'Ingresos, egresos y balance consolidado a partir de ventas, compras y gastos.'
  }, [activeTab])

  return (
    <div
      className={cn(
        reportUi.page,
        '-m-4 flex min-h-full flex-col gap-5 p-4 md:-m-6 md:gap-6 md:p-6'
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Vistas de reporte">
            {REPORT_VIEWS.map((view) => {
              const active = activeTab === view.id
              return (
                <button
                  key={view.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleTabChange(view.id)}
                  className={cn(
                    reportUi.chip,
                    'cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15',
                    active
                      ? 'ring-2 ring-neutral-900/10'
                      : 'opacity-65 hover:border-neutral-300 hover:bg-neutral-100 hover:opacity-100'
                  )}
                >
                  {view.icon}
                  {view.label}
                </button>
              )
            })}
          </div>
          <h1 className={`${reportUi.title} mt-3`}>
            {activeTab === 'inventario' ? 'Inventario' : 'Estado de cuenta'}
          </h1>
          <p className={`${reportUi.subtitle} mt-2 max-w-xl`}>{subtitle}</p>
        </div>

        {activeTab === 'estado-cuenta' ? (
          <div className={cn(reportUi.panel, 'flex items-center gap-2 px-4 py-2.5 shadow-none')}>
            <CalendarDays className="size-4 text-neutral-500" />
            <span className="text-sm capitalize text-neutral-700">{currentPeriodLabel()}</span>
          </div>
        ) : (
          <div className={cn(reportUi.panel, 'flex items-center gap-2 px-4 py-2.5 shadow-none')}>
            <Package className="size-4 text-neutral-500" />
            <span className="text-sm text-neutral-700">Snapshot de stock</span>
          </div>
        )}
      </header>

      {activeTab === 'inventario' ? <InventoryReportPanel /> : <AccountStatementPanel />}
    </div>
  )
}
