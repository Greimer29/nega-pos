import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { FinancialSummaryView } from '@/features/reports/components/financial-summary-view'
import { ReportPeriodFilters } from '@/features/reports/components/report-period-filters'
import { formatFecha } from '@/features/reports/constants'
import { useFinancialSummaryQuery } from '@/features/reports/hooks/use-reports'
import {
  defaultReportPeriodState,
  periodLabelFromState,
  periodStateToAccountParams,
  type ReportPeriodState,
} from '@/features/reports/report-period'
import { reportUi } from '@/features/reports/report-ui'
import { QueryErrorState } from '@/features/notifications/query-error-state'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'

type FinancialSummaryFilters = {
  period: ReportPeriodState
}

function defaultFinancialSummaryFilters(): FinancialSummaryFilters {
  return { period: defaultReportPeriodState() }
}

export function FinancialSummaryPanel() {
  const { company } = useAuth()
  const { displayCurrency } = useDisplayCurrency()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('reports-financial-summary', company?.id),
    defaultFinancialSummaryFilters()
  )

  const { period } = filters

  const queryParams = useMemo(() => {
    const periodParams = periodStateToAccountParams(period)
    return {
      ...periodParams,
      display_currency: displayCurrency,
    }
  }, [period, displayCurrency])

  const { data, isLoading, isError, error } = useFinancialSummaryQuery(queryParams)

  const periodLabel = data
    ? `${formatFecha(data.period.from)} — ${formatFecha(data.period.to)}`
    : periodLabelFromState(period)

  return (
    <div className="space-y-5">
      <div className={cn(reportUi.panel, 'p-5 md:p-6')}>
        <ReportPeriodFilters
          value={period}
          onChange={(value) => setFilters((prev) => ({ ...prev, period: value }))}
        />
      </div>

      {isLoading ? (
        <div
          className={`${reportUi.panel} flex items-center justify-center gap-2 py-20 text-sm text-neutral-400`}
        >
          <Loader2 className="size-4 animate-spin" />
          Generando resumen…
        </div>
      ) : isError ? (
        <div className={reportUi.panel}>
          <QueryErrorState isError error={error} title="No se pudo generar el resumen" />
        </div>
      ) : !data ? (
        <div className={reportUi.panel}>
          <p className={`${reportUi.body} px-5 py-12 text-center`}>
            No se recibió información del resumen. Intentá actualizar la página o cambiar el período.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className={reportUi.muted}>
              Período: <span className="font-medium text-neutral-800">{periodLabel}</span>
            </p>
            <p className={reportUi.muted}>
              Visualización: <span className="font-medium text-neutral-800">{displayCurrency}</span>
              {' · '}
              Tasas:{' '}
              {Object.entries(data.rates)
                .map(([code, rate]) => `${code}=${rate}`)
                .join(' · ')}
            </p>
          </div>

          <FinancialSummaryView data={data} />
        </>
      )}
    </div>
  )
}
