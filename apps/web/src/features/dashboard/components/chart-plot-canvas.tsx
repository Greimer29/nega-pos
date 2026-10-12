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

function resolveSplit(point: VentasSeriePoint): {
  totalUsd: number
  contadoUsd: number
  creditoUsd: number
} {
  const totalUsd = Number(point.totalUsd)
  let contadoUsd = Number(point.contadoUsd ?? NaN)
  let creditoUsd = Number(point.creditoUsd ?? NaN)

  if (!Number.isFinite(contadoUsd)) contadoUsd = 0
  if (!Number.isFinite(creditoUsd)) creditoUsd = 0

  // API vieja o filas sin payment_type: usar el total como contado para no dejar la barra vacía.
  if (Number.isFinite(totalUsd) && totalUsd > 0 && contadoUsd <= 0 && creditoUsd <= 0) {
    contadoUsd = totalUsd
  }

  return {
    totalUsd: Number.isFinite(totalUsd) ? totalUsd : contadoUsd + creditoUsd,
    contadoUsd,
    creditoUsd,
  }
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
          const { totalUsd, contadoUsd, creditoUsd } = resolveSplit(point)
          const heightPct = yMaxUsd > 0 ? Math.min(100, (totalUsd / yMaxUsd) * 100) : 0
          const isPeak = totalUsd > 0 && totalUsd === seriesPeak
          const variation =
            point.variacionPct !== null
              ? ` (${point.variacionPct > 0 ? '+' : ''}${point.variacionPct}%)`
              : ''
          const contadoPct = totalUsd > 0 ? (contadoUsd / totalUsd) * 100 : 0
          const creditoPct = totalUsd > 0 ? (creditoUsd / totalUsd) * 100 : 0

          return (
            <div key={index} className={dashboardUi.chartBarSlot}>
              <div className={dashboardUi.chartTooltip}>
                <p className="font-semibold">{formatFromUsd(totalUsd)}</p>
                <p className="font-normal text-neutral-600">
                  Contado {formatFromUsd(contadoUsd)}
                </p>
                <p className="font-normal text-amber-700">
                  Crédito {formatFromUsd(creditoUsd)}
                </p>
                <p className="font-normal text-neutral-500">
                  {point.label}
                  {variation}
                </p>
              </div>
              {totalUsd > 0 && heightPct > 0 ? (
                <div
                  className="relative w-full max-w-7 overflow-hidden rounded-full"
                  style={{ height: `${heightPct}%` }}
                  aria-label={`${point.label}: total ${formatFromUsd(totalUsd)}, contado ${formatFromUsd(contadoUsd)}, crédito ${formatFromUsd(creditoUsd)}`}
                >
                  {contadoUsd > 0 ? (
                    <div
                      className={
                        creditoUsd > 0
                          ? isPeak
                            ? 'absolute inset-x-0 bottom-0 bg-[#0d3d2e]'
                            : 'absolute inset-x-0 bottom-0 bg-neutral-300'
                          : isPeak
                            ? dashboardUi.barCashSolo
                            : dashboardUi.barMuted
                      }
                      style={{ height: `${contadoPct}%` }}
                    />
                  ) : null}
                  {creditoUsd > 0 ? (
                    <div
                      className={
                        contadoUsd > 0
                          ? 'absolute inset-x-0 bg-amber-400/90'
                          : dashboardUi.barCreditSolo
                      }
                      style={
                        contadoUsd > 0
                          ? { bottom: `${contadoPct}%`, height: `${creditoPct}%` }
                          : { height: '100%' }
                      }
                    />
                  ) : null}
                </div>
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
