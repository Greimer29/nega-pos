import { useFormatMoney } from '@/features/currencies/context/display-currency-context'
import {
  ChartPlotCanvas,
  ChartYAxis,
} from '@/features/dashboard/components/chart-plot-canvas'
import type { VentasSeriePoint } from '@/features/dashboard/types'
import { dashboardUi } from '@/features/dashboard/dashboard-ui'
import { buildUsdStepAxis } from '@/features/dashboard/utils/chart-y-axis'
import { cn } from '@/lib/utils'

type DashboardSalesChartProps = {
  series: VentasSeriePoint[]
  mode: 'daily' | 'weekly' | 'monthly'
  onModeChange: (mode: 'daily' | 'weekly' | 'monthly') => void
  chartError?: string | null
  isUpdating?: boolean
  dailyEnabled?: boolean
}

const MODE_SUBTITLE: Record<DashboardSalesChartProps['mode'], string> = {
  daily: 'diario',
  weekly: 'semanal',
  monthly: 'mensual',
}

export function DashboardSalesChart({
  series,
  mode,
  onModeChange,
  chartError,
  isUpdating = false,
  dailyEnabled = true,
}: DashboardSalesChartProps) {
  const { formatFromUsd } = useFormatMoney()

  const dataMax =
    series.length > 0 ? Math.max(...series.map((point) => Number(point.totalUsd)), 0) : 0
  const seriesPeak = dataMax
  const { yMaxUsd, ticksUsd } = buildUsdStepAxis(dataMax)

  return (
    <div className={dashboardUi.metricCardFill}>
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h3 className={dashboardUi.sectionTitle}>Ventas</h3>
          <p className={dashboardUi.muted}>Comparativo {MODE_SUBTITLE[mode]}</p>
        </div>
        <div className="inline-flex items-center gap-2">
          {isUpdating ? (
            <span className="text-muted-foreground text-xs">Actualizando…</span>
          ) : null}
          <div className="inline-flex rounded-full bg-neutral-100 p-1">
          <button
            type="button"
            disabled={!dailyEnabled}
            title={
              dailyEnabled
                ? undefined
                : 'La vista diaria aún no está disponible en el servidor.'
            }
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              mode === 'daily' ? 'bg-neutral-900 text-white' : 'text-neutral-600',
              !dailyEnabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => onModeChange('daily')}
          >
            Diario
          </button>
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              mode === 'weekly' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
            )}
            onClick={() => onModeChange('weekly')}
          >
            Semanal
          </button>
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              mode === 'monthly' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
            )}
            onClick={() => onModeChange('monthly')}
          >
            Mensual
          </button>
          </div>
        </div>
      </div>

      {chartError ? (
        <p className="text-destructive mb-3 text-xs whitespace-pre-line">{chartError}</p>
      ) : null}

      <div className={dashboardUi.chartBody}>
        <div className={dashboardUi.chartPlotRow}>
          <ChartYAxis ticksUsd={ticksUsd} yMaxUsd={yMaxUsd} formatFromUsd={formatFromUsd} />
          <ChartPlotCanvas
            series={series}
            yMaxUsd={yMaxUsd}
            ticksUsd={ticksUsd}
            seriesPeak={seriesPeak}
            formatFromUsd={formatFromUsd}
          />
        </div>

        <div className={dashboardUi.chartXRow}>
          {series.map((point, index) => (
            <span key={index} className={dashboardUi.chartXLabel}>
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
