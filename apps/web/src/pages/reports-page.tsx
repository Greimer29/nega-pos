import { BarChart3, CalendarDays } from 'lucide-react'
import { AccountStatementPanel } from '@/features/reports/components/account-statement-panel'
import { currentMonthIso } from '@/features/reports/constants'
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

export function ReportsPage() {
  return (
    <div
      className={cn(
        reportUi.page,
        '-m-4 flex min-h-full flex-col gap-5 p-4 md:-m-6 md:gap-6 md:p-6'
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={reportUi.chip}>
            <BarChart3 className="size-3.5 text-[#0d3d2e]" />
            Reportes financieros
          </p>
          <h1 className={`${reportUi.title} mt-3`}>Estado de cuenta</h1>
          <p className={`${reportUi.subtitle} mt-2 max-w-xl`}>
            Ingresos, egresos y balance consolidado a partir de ventas, compras y gastos.
          </p>
        </div>

        <div className={cn(reportUi.panel, 'flex items-center gap-2 px-4 py-2.5 shadow-none')}>
          <CalendarDays className="size-4 text-neutral-500" />
          <span className="text-sm capitalize text-neutral-700">{currentPeriodLabel()}</span>
        </div>
      </header>

      <AccountStatementPanel />
    </div>
  )
}
