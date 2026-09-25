import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { BalancePositionSummaryView } from '@/features/reports/components/balance-position-summary'
import { formatFecha } from '@/features/reports/constants'
import { useBalancePositionQuery } from '@/features/reports/hooks/use-reports'
import { reportUi } from '@/features/reports/report-ui'
import { QueryErrorState } from '@/features/notifications/query-error-state'

export function BalancePositionPanel() {
  const { displayCurrency } = useDisplayCurrency()

  const queryParams = useMemo(
    () => ({ display_currency: displayCurrency }),
    [displayCurrency]
  )

  const { data, isLoading, isError, error } = useBalancePositionQuery(queryParams)

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div
          className={`${reportUi.panel} flex items-center justify-center gap-2 py-20 text-sm text-neutral-400`}
        >
          <Loader2 className="size-4 animate-spin" />
          Generando reporte…
        </div>
      ) : isError ? (
        <div className={reportUi.panel}>
          <QueryErrorState isError error={error} title="No se pudo generar el reporte" />
        </div>
      ) : !data ? (
        <div className={reportUi.panel}>
          <p className={`${reportUi.body} px-5 py-12 text-center`}>
            No se recibió información del reporte. Intentá actualizar la página.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className={reportUi.muted}>
              Al: <span className="font-medium text-neutral-800">{formatFecha(data.asOf)}</span>
            </p>
            <p className={reportUi.muted}>
              Visualización: <span className="font-medium text-neutral-800">{displayCurrency}</span>
              {' · '}
              Tasas:{' '}
              {Object.entries(data.summary.rates)
                .map(([code, rate]) => `${code}=${rate}`)
                .join(' · ')}
            </p>
          </div>

          <BalancePositionSummaryView summary={data.summary} asOf={data.asOf} />
        </>
      )}
    </div>
  )
}
