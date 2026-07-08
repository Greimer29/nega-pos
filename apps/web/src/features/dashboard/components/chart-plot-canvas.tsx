import type { VentasSeriePoint } from '@/features/dashboard/types'
import { dashboardUi } from '@/features/dashboard/dashboard-ui'
import { cn } from '@/lib/utils'

type ChartYAxisProps = {
  ticksUsd: number[]
  yMaxUsd: number
  formatFromUsd: (amountUsd: number) => string
  className?: string
}

export function ChartYAxis({ ticksUsd, yMaxUsd, formatFromUsd, className }: ChartYAxisProps) {
  return (
    <div className={cn(dashboardUi.chartYAxis, className)} aria-hidden>
      {ticksUsd.map((tick) => (
        <span
          key={tick}
          className={dashboardUi.chartYAxisTick}
          style={{ bottom: `${yMaxUsd > 0 ? (tick / yMaxUsd) * 100 : 0}%` }}
        >
          {formatFromUsd(tick)}
        </span>
      ))}
    </div>
  )
}

type ChartPlotCanvasProps = {
  series: VentasSeriePoint[]
  yMaxUsd: number
  ticksUsd: number[]
  seriesPeak: number
  formatFromUsd: (amountUsd: number) => string
  className?: string
}

export function ChartPlotCanvas({
  series,
  yMaxUsd,
  ticksUsd,
  seriesPeak,
  formatFromUsd,
  className,
}: ChartPlotCanvasProps) {
  return (
    <div className={cn(dashboardUi.chartPlotCanvas, className)}>
      {ticksUsd.map((tick) => (
        <div
          key={tick}
          className={dashboardUi.chartGridLine}
          style={{ bottom: `${yMaxUsd > 0 ? (tick / yMaxUsd) * 100 : 0}%` }}
        />
      ))}

      <div className={dashboardUi.chartBarsLayer}>
        {series.map((point, index) => {
          const valueUsd = Number(point.totalUsd)
          const heightPct = yMaxUsd > 0 ? (valueUsd / yMaxUsd) * 100 : 0
          const isPeak = valueUsd > 0 && valueUsd === seriesPeak
          const variation =
            point.variacionPct !== null
              ? ` (${point.variacionPct > 0 ? '+' : ''}${point.variacionPct}%)`
              : ''

          return (
            <div key={index} className={dashboardUi.chartBarSlot}>
              <div className={dashboardUi.chartTooltip}>
                <p className="font-semibold">{formatFromUsd(valueUsd)}</p>
                <p className="font-normal text-neutral-500">
                  {point.label}
                  {variation}
                </p>
              </div>
              {valueUsd > 0 ? (
                <div
                  className={isPeak ? dashboardUi.bar : dashboardUi.barMuted}
                  style={{ height: `${heightPct}%` }}
                />
              ) : (
                <div className="h-0 w-full max-w-7" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
