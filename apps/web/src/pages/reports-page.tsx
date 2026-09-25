import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccountStatementPanel } from '@/features/reports/components/account-statement-panel'
import { IncomeStatementPanel } from '@/features/reports/components/income-statement-panel'
import { InventoryReportPanel } from '@/features/reports/components/inventory-report-panel'
import { ReportHubSelect } from '@/features/reports/components/report-hub-select'
import {
  FINANCIAL_SUB_REPORTS,
  parseFinancialSubReport,
  parseReportsHubTab,
  type FinancialSubReport,
  type ReportsHubTab,
} from '@/features/reports/constants'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<ReportsHubTab>(() =>
    parseReportsHubTab(searchParams.get('vista'))
  )
  const [activeSub, setActiveSub] = useState<FinancialSubReport>(() =>
    parseFinancialSubReport(searchParams.get('sub'))
  )

  useEffect(() => {
    setActiveTab(parseReportsHubTab(searchParams.get('vista')))
    setActiveSub(parseFinancialSubReport(searchParams.get('sub')))
  }, [searchParams])

  function handleTabChange(tab: ReportsHubTab) {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    if (tab === 'inventario') {
      next.set('vista', 'inventario')
      next.delete('sub')
    } else {
      next.delete('vista')
      next.set('sub', 'flujo')
      for (const key of [...next.keys()]) {
        if (key.startsWith('inv_')) next.delete(key)
      }
      setActiveSub('flujo')
    }
    setSearchParams(next, { replace: true })
  }

  function handleSubChange(sub: FinancialSubReport) {
    const meta = FINANCIAL_SUB_REPORTS.find((item) => item.id === sub)
    if (!meta?.enabled) return
    setActiveSub(sub)
    const next = new URLSearchParams(searchParams)
    next.delete('vista')
    next.set('sub', sub)
    setSearchParams(next, { replace: true })
  }

  const { title, subtitle } = useMemo(() => {
    if (activeTab === 'inventario') {
      return {
        title: 'Inventario',
        subtitle:
          'Stock actual de productos de catálogo y materiales, con filtros y exportación.',
      }
    }
    if (activeSub === 'resultados') {
      return {
        title: 'Estado de resultados',
        subtitle:
          'Resultado del período a devengo: ingresos por ventas − CMV − gastos operativos. No es flujo de caja ni situación patrimonial.',
      }
    }
    return {
      title: 'Flujo de caja',
      subtitle:
        'Flujo de caja del período: entradas menos salidas. No equivale al saldo total de la empresa ni a la utilidad.',
    }
  }, [activeTab, activeSub])

  return (
    <div
      className={cn(
        reportUi.page,
        '-m-4 flex min-h-full flex-col gap-5 p-4 md:-m-6 md:gap-6 md:p-6'
      )}
    >
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {/* En móvil el select va primero; en desktop a la derecha */}
        <div className="order-1 md:order-2">
          <ReportHubSelect value={activeTab} onChange={handleTabChange} />
        </div>

        <div className="order-2 min-w-0 md:order-1">
          {activeTab === 'financiero' ? (
            <div
              className="flex flex-wrap items-center gap-2"
              role="tablist"
              aria-label="Subreportes financieros"
            >
              {FINANCIAL_SUB_REPORTS.map((sub) => {
                const active = activeSub === sub.id
                if (!sub.enabled) {
                  return (
                    <span
                      key={sub.id}
                      title="Próximamente"
                      aria-disabled="true"
                      className={cn(reportUi.chip, 'cursor-not-allowed opacity-45')}
                    >
                      {sub.label}
                    </span>
                  )
                }
                return (
                  <button
                    key={sub.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleSubChange(sub.id)}
                    className={cn(
                      reportUi.chip,
                      'cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15',
                      active
                        ? 'ring-2 ring-neutral-900/10'
                        : 'opacity-65 hover:border-neutral-300 hover:bg-neutral-100 hover:opacity-100'
                    )}
                  >
                    {sub.label}
                  </button>
                )
              })}
            </div>
          ) : null}
          <h1 className={cn(reportUi.title, activeTab === 'financiero' ? 'mt-3' : undefined)}>
            {title}
          </h1>
          <p className={`${reportUi.subtitle} mt-2 max-w-xl`}>{subtitle}</p>
        </div>
      </header>

      {activeTab === 'inventario' ? (
        <InventoryReportPanel />
      ) : activeSub === 'resultados' ? (
        <IncomeStatementPanel />
      ) : (
        <AccountStatementPanel />
      )}
    </div>
  )
}
