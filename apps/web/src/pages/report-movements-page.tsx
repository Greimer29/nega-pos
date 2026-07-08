import { ArrowLeft, Loader2 } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { ReportMovementsTable } from '@/features/reports/components/report-movements-table'
import { ReportPeriodFilters } from '@/features/reports/components/report-period-filters'
import { getReportCategory } from '@/features/reports/report-categories'
import {
  applyPeriodToSearchParams,
  parsePeriodFromSearchParams,
  periodLabelFromState,
} from '@/features/reports/report-period'
import { parseReportSearchParams } from '@/features/reports/report-search-params'
import { reportUi } from '@/features/reports/report-ui'
import { useAccountStatementQuery } from '@/features/reports/hooks/use-reports'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

export function ReportMovementsPage() {
  const { category: categorySlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { displayCurrency } = useDisplayCurrency()
  const category = getReportCategory(categorySlug)

  const period = useMemo(() => parsePeriodFromSearchParams(searchParams), [searchParams])

  const queryParams = useMemo(
    () => (category ? parseReportSearchParams(searchParams, category.slug) : {}),
    [searchParams, category]
  )

  const { data, isLoading, isError, error } = useAccountStatementQuery(queryParams, {
    enabled: category !== null,
  })

  const handlePeriodChange = useCallback(
    (nextPeriod: typeof period) => {
      const params = applyPeriodToSearchParams(new URLSearchParams(searchParams), nextPeriod)
      if (displayCurrency) {
        params.set('display_currency', displayCurrency)
      }
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams, displayCurrency]
  )

  if (!category) {
    return <Navigate to="/reportes" replace />
  }

  const periodLabel = periodLabelFromState(period)
  const backHref = searchParams.toString() ? `/reportes?${searchParams.toString()}` : '/reportes'
  const movements = data?.movements ?? []

  return (
    <div
      className={cn(
        reportUi.page,
        '-m-4 flex min-h-full flex-col gap-5 p-4 md:-m-6 md:gap-6 md:p-6'
      )}
    >
      <header className="space-y-4">
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors duration-500 ease-out hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Volver a reportes
        </Link>

        <div>
          <p className={reportUi.chip}>{category.subtitle}</p>
          <h1 className={`${reportUi.title} mt-3`}>{category.title}</h1>
          <p className={`${reportUi.subtitle} mt-2`}>
            Período: <span className="font-medium capitalize text-neutral-800">{periodLabel}</span>
          </p>
        </div>
      </header>

      <div className={cn(reportUi.panel, 'p-5 md:p-6')}>
        <p className={`mb-3 ${reportUi.muted}`}>Filtrar por fecha</p>
        <ReportPeriodFilters value={period} onChange={handlePeriodChange} />
      </div>

      {isLoading ? (
        <div
          className={`${reportUi.panel} flex items-center justify-center gap-2 py-20 text-sm text-neutral-400`}
        >
          <Loader2 className="size-4 animate-spin" />
          Cargando movimientos…
        </div>
      ) : isError ? (
        <div className={reportUi.error}>{getApiErrorMessage(error)}</div>
      ) : !data ? (
        <div className={reportUi.panel}>
          <p className={`${reportUi.body} px-5 py-12 text-center`}>
            No se recibió información del reporte. Intentá actualizar la página o cambiar el período.
          </p>
        </div>
      ) : (
        <div className="report-content-enter">
          <ReportMovementsTable
            movements={movements}
            title={category.title}
            subtitle={`${movements.length} registro${movements.length === 1 ? '' : 's'}`}
            categorySlug={category.slug}
          />
        </div>
      )}
    </div>
  )
}
