import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { ReportMovementsTable } from '@/features/reports/components/report-movements-table'
import { ReportBreakdownChart } from '@/features/reports/components/report-breakdown-chart'
import {
  ReportFiltersToolbar,
  type ReportTypeFilters,
} from '@/features/reports/components/report-filters-toolbar'
import { ReportFlowChart } from '@/features/reports/components/report-flow-chart'
import { ReportKpiGrid } from '@/features/reports/components/report-kpi-grid'
import { formatFecha } from '@/features/reports/constants'
import {
  defaultReportPeriodState,
  parsePeriodFromSearchParams,
  periodLabelFromState,
  periodStateToAccountParams,
  type ReportPeriodState,
} from '@/features/reports/report-period'
import { buildReportSearchParams } from '@/features/reports/report-search-params'
import { reportUi } from '@/features/reports/report-ui'
import { useAccountStatementQuery } from '@/features/reports/hooks/use-reports'
import { QueryErrorState } from '@/features/notifications/query-error-state'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'

type AccountStatementFilters = {
  period: ReportPeriodState
  accountId: number | null
  unassignedOnly: boolean
  types: ReportTypeFilters
}

const DEFAULT_TYPES: ReportTypeFilters = {
  sales: true,
  incomes: true,
  purchases: true,
  expenses: true,
  machine_expenses: true,
}

function defaultAccountStatementFilters(): AccountStatementFilters {
  return {
    period: defaultReportPeriodState(),
    accountId: null,
    unassignedOnly: false,
    types: { ...DEFAULT_TYPES },
  }
}

function hasFinancialFilterParams(searchParams: URLSearchParams): boolean {
  return [
    'account_id',
    'unassigned',
    'day',
    'date',
    'year',
    'range',
    'from',
    'to',
    'month',
  ].some((key) => searchParams.has(key))
}

export function AccountStatementPanel() {
  const { company } = useAuth()
  const [searchParams] = useSearchParams()
  const { displayCurrency } = useDisplayCurrency()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('reports-account-statement', company?.id),
    defaultAccountStatementFilters()
  )
  const urlAppliedRef = useRef(false)

  // Drill-down "Volver a reportes" brings period/account in the URL — URL wins once.
  useEffect(() => {
    if (urlAppliedRef.current) return
    if (!hasFinancialFilterParams(searchParams)) return
    urlAppliedRef.current = true
    const accountIdRaw = searchParams.get('account_id')
    const unassignedOnly = searchParams.get('unassigned') === '1'
    setFilters((prev) => ({
      ...prev,
      period: parsePeriodFromSearchParams(searchParams),
      accountId: unassignedOnly ? null : accountIdRaw ? Number(accountIdRaw) : null,
      unassignedOnly,
    }))
  }, [searchParams, setFilters])

  const { period, accountId, unassignedOnly, types } = filters

  const queryParams = useMemo(() => {
    const selectedTypes = (
      Object.entries(types) as Array<[keyof typeof types, boolean]>
    )
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)

    const periodParams = periodStateToAccountParams(period)

    return {
      ...periodParams,
      account_id: unassignedOnly ? undefined : accountId ?? undefined,
      unassigned: unassignedOnly || undefined,
      display_currency: displayCurrency,
      types: selectedTypes,
    }
  }, [period, accountId, unassignedOnly, displayCurrency, types])

  const { data, isLoading, isError, error } = useAccountStatementQuery(queryParams)

  const filterSearch = useMemo(
    () =>
      buildReportSearchParams({
        period,
        accountId,
        unassignedOnly,
        displayCurrency,
      }),
    [period, accountId, unassignedOnly, displayCurrency]
  )

  const periodLabel = data
    ? `${formatFecha(data.period.from)} — ${formatFecha(data.period.to)}`
    : periodLabelFromState(period)

  return (
    <div className="space-y-5">
      <ReportFiltersToolbar
        period={period}
        accountId={accountId}
        unassignedOnly={unassignedOnly}
        types={types}
        onPeriodChange={(value) => setFilters((prev) => ({ ...prev, period: value }))}
        onAccountIdChange={(value) => setFilters((prev) => ({ ...prev, accountId: value }))}
        onUnassignedOnlyChange={(value) =>
          setFilters((prev) => ({ ...prev, unassignedOnly: value }))
        }
        onTypesChange={(value) => setFilters((prev) => ({ ...prev, types: value }))}
      />

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
            No se recibió información del reporte. Intentá actualizar la página o cambiar el período.
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
              {Object.entries(data.summary.rates)
                .map(([code, rate]) => `${code}=${rate}`)
                .join(' · ')}
            </p>
          </div>

          <ReportKpiGrid summary={data.summary} filterSearch={filterSearch} />

          <div className="grid gap-5 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <ReportFlowChart movements={data.movements} />
            </div>
            <div className="xl:col-span-2">
              <ReportBreakdownChart summary={data.summary} />
            </div>
          </div>

          <ReportMovementsTable movements={data.movements} />
        </>
      )}
    </div>
  )
}
