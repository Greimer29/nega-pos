import { Loader2, Receipt } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
import { getApiErrorMessage } from '@/lib/api-error'

function todayLabel() {
  return new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardPage() {
  const [chartMode, setChartMode] = useState<DashboardChartMode>('weekly')
  const [chartError, setChartError] = useState<string | null>(null)
  const lastSuccessfulChartModeRef = useRef<DashboardChartMode>('weekly')
  const { data, isLoading, isError, error, isFetching, isPlaceholderData } =
    useDashboardOverviewQuery(chartMode)

  const chartValidationFailed = Boolean(isError && error && isDashboardChartValidationError(error))
  const isInitialLoad = isLoading && !data
  const isPageError = isError && !data && !chartValidationFailed

  useEffect(() => {
    if (data && !isError && !isFetching) {
      lastSuccessfulChartModeRef.current = chartMode
      setChartError(null)

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
      setChartError(DASHBOARD_DAILY_CHART_MESSAGE)

      if (chartMode === 'daily') {
        setChartMode(lastSuccessfulChartModeRef.current)
      }

      return
    }

    if (!data) {
      return
    }

    setChartError(getApiErrorMessage(error))

    if (chartMode !== lastSuccessfulChartModeRef.current) {
      setChartMode(lastSuccessfulChartModeRef.current)
    }
  }, [chartMode, data, error, isError])

  function handleChartModeChange(mode: DashboardChartMode) {
    if (!canSelectDashboardChartMode(mode)) {
      setChartError(DASHBOARD_DAILY_CHART_MESSAGE)
      return
    }

    setChartError(null)
    setChartMode(mode)
  }

  return (
    <div className={dashboardUi.page}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">Resumen del taller — {todayLabel()}</p>
        </div>
        <Button variant="outline" size="sm" asChild title="Cierre diario">
          <Link to="/dashboard/cierre-diario">
            <Receipt />
            Cierre diario
          </Link>
        </Button>
      </div>

      {isPageError ? (
        <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
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
                chartError={chartError}
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
              description="Compras a crédito por cancelar"
              rows={data.proveedoresCredito}
              linkBase="/suppliers"
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
