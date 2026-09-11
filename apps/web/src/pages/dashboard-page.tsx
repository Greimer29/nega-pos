import { Loader2, Receipt } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { DashboardCreditTable } from '@/features/dashboard/components/dashboard-credit-table'
import { DashboardDailySalesCard } from '@/features/dashboard/components/dashboard-daily-sales-card'
import { DashboardLowStockList } from '@/features/dashboard/components/dashboard-low-stock-list'
import { DashboardSalesChart } from '@/features/dashboard/components/dashboard-sales-chart'
import { dashboardUi } from '@/features/dashboard/dashboard-ui'
import { useDashboardOverviewQuery } from '@/features/dashboard/hooks/use-dashboard'
import type { DashboardChartMode } from '@/features/dashboard/types'
import {
  canSelectDashboardChartMode,
  DASHBOARD_DAILY_CHART_MESSAGE,
  isDailyDashboardChartSupported,
  isDashboardChartValidationError,
  markDailyDashboardChartSupported,
} from '@/features/dashboard/utils/dashboard-chart-support'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { pageHeaderClass } from '@/components/layout/responsive-toolbar'

type DashboardChartState = {
  chartMode: DashboardChartMode
}

const DEFAULT_DASHBOARD_CHART: DashboardChartState = {
  chartMode: 'weekly',
}

function todayLabel() {
  return new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardPage() {
  const { company } = useAuth()
  const [chartState, setChartState] = useSessionPersistedState(
    sessionFilterKey('dashboard-chart', company?.id),
    DEFAULT_DASHBOARD_CHART
  )
  const chartMode = chartState.chartMode
  const lastSuccessfulChartModeRef = useRef<DashboardChartMode>('weekly')
  const { data, isLoading, isError, error, isFetching, isPlaceholderData } =
    useDashboardOverviewQuery(chartMode)

  const chartValidationFailed = Boolean(isError && error && isDashboardChartValidationError(error))
  const isInitialLoad = isLoading && !data
  const isPageError = isError && !data && !chartValidationFailed

  useEffect(() => {
    if (data && !isError && !isFetching) {
      lastSuccessfulChartModeRef.current = chartMode

      if (chartMode === 'daily') {
        markDailyDashboardChartSupported(true)
      }
    }
  }, [chartMode, data, isError, isFetching])

  useEffect(() => {
    if (!isError || !error) {
      return
    }

    if (isDashboardChartValidationError(error)) {
      markDailyDashboardChartSupported(false)
      toast.warning(DASHBOARD_DAILY_CHART_MESSAGE)

      if (chartMode === 'daily') {
        setChartState({ chartMode: lastSuccessfulChartModeRef.current })
      }

      return
    }

    if (!data) {
      return
    }

    notifyApiError(error, 'No se pudo cargar el gráfico')

    if (chartMode !== lastSuccessfulChartModeRef.current) {
      setChartState({ chartMode: lastSuccessfulChartModeRef.current })
    }
  }, [chartMode, data, error, isError, setChartState])

  function handleChartModeChange(mode: DashboardChartMode) {
    if (!canSelectDashboardChartMode(mode)) {
      toast.warning(DASHBOARD_DAILY_CHART_MESSAGE)
      return
    }

    setChartState({ chartMode: mode })
  }

  return (
    <div className={dashboardUi.page}>
      <div className={pageHeaderClass}>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">Resumen del día — {todayLabel()}</p>
        </div>
        <Button variant="outline" size="sm" asChild title="Cierre diario" className="w-fit shrink-0">
          <Link to="/dashboard/cierre-diario">
            <Receipt />
            Cierre diario
          </Link>
        </Button>
      </div>

      {isPageError ? (
        <QueryErrorState isError={isPageError} error={error} title="No se pudo cargar el dashboard" />
      ) : null}

      {isInitialLoad || (chartValidationFailed && !data) ? (
        <div className="flex justify-center py-24">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className={dashboardUi.topGridRow}>
            <div className={dashboardUi.topGridCell}>
              <DashboardDailySalesCard ventas={data.ventasDelDia} ganancia={data.gananciaDelDia} />
            </div>
            <div className={dashboardUi.topGridCell}>
              <DashboardSalesChart
                series={data.ventasSeries}
                mode={chartMode}
                onModeChange={handleChartModeChange}
                isUpdating={isFetching && isPlaceholderData}
                dailyEnabled={isDailyDashboardChartSupported()}
              />
            </div>
            <div className={dashboardUi.topGridCell}>
              <DashboardLowStockList products={data.bajoStockProductos} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardCreditTable
              title="Créditos clientes"
              description="Saldos pendientes por cobrar"
              rows={data.clientesCredito}
              linkBase="/customers"
              linkSuffix="/cuenta"
              showOrders
            />
            <DashboardCreditTable
              title="Créditos proveedores"
              description="Cuentas por pagar: no afectan caja hasta el abono"
              rows={data.proveedoresCredito}
              linkBase="/suppliers"
              overdueLabel="Hay deudas vencidas por pagar"
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
