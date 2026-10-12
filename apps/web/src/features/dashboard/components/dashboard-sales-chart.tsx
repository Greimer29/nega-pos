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
  isUpdating = false,
  dailyEnabled = true,
}: DashboardSalesChartProps) {
  const { formatFromUsd } = useFormatMoney()

  const dataMax =
    series.length > 0 ? Math.max(...series.map((point) => Number(point.totalUsd)), 0) : 0
  const seriesPeak = dataMax
  const { yMaxUsd, ticksUsd } = buildUsdStepAxis(dataMax)

  const latest = series.length > 0 ? series[series.length - 1]! : null
  const latestTotal = latest ? Number(latest.totalUsd) : 0
  const latestContadoRaw = latest ? Number(latest.contadoUsd ?? NaN) : 0
  const latestCreditoRaw = latest ? Number(latest.creditoUsd ?? NaN) : 0
  const latestCredito = Number.isFinite(latestCreditoRaw) ? latestCreditoRaw : 0
  const latestContado =
    Number.isFinite(latestContadoRaw) && latestContadoRaw > 0
      ? latestContadoRaw
      : latestTotal > 0 && latestCredito <= 0
        ? latestTotal
        : Number.isFinite(latestContadoRaw)
          ? latestContadoRaw
          : 0

  return (
    <div className={dashboardUi.metricCardFill}>
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h3 className={dashboardUi.sectionTitle}>Ventas</h3>
          <p className={dashboardUi.muted}>Comparativo {MODE_SUBTITLE[mode]}</p>
          {latest && latestTotal > 0 ? (
            <p className="mt-1 text-xs tabular-nums text-neutral-700">
              {latest.label}: {formatFromUsd(latestTotal)}
              <span className="text-neutral-500"> · Contado {formatFromUsd(latestContado)}</span>
              <span className="text-amber-700"> · Crédito {formatFromUsd(latestCredito)}</span>
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-[#0d3d2e]" aria-hidden />
              Contado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
              Crédito
            </span>
          </div>
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
