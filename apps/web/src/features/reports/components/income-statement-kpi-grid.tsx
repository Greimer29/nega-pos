import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { currencySymbol } from '@/features/reports/constants'
import { ReportStatementCascade } from '@/features/reports/components/report-statement-cascade'
import { reportUi } from '@/features/reports/report-ui'
import type { IncomeStatementSummary } from '@/features/reports/types'
import { formatReportDisplayAmount } from '@/features/reports/utils/format-report-amount'
import { cn } from '@/lib/utils'

type IncomeStatementKpiGridProps = {
  summary: IncomeStatementSummary
}

function formatMarginPct(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—'
  return `${value.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} %`
}

export function IncomeStatementKpiGrid({ summary }: IncomeStatementKpiGridProps) {
  const { displayCurrency, formatFromUsd, baseCurrencyCode } = useDisplayCurrency()
  const operatingIncomeUsd = Number(summary.operatingIncomeUsd)
  const isPositive = operatingIncomeUsd >= 0
  const formatUsd = (amountUsd: string) => formatReportDisplayAmount(amountUsd, formatFromUsd)

  return (
    <div className="space-y-4">
      <HeroKpiCard
        netLabel={formatUsd(summary.operatingIncomeUsd)}
        currency={displayCurrency}
        baseCurrencyCode={baseCurrencyCode}
        isPositive={isPositive}
        grossMarginPct={summary.grossMarginPct}
        operatingMarginPct={summary.operatingMarginPct}
      />

      <ReportStatementCascade
        title="Cuenta de resultados"
        subtitle="Lectura de arriba hacia abajo."
        ariaLabel="Estado de resultados"
        rows={[
          {
            id: 'revenue',
            label: 'Ingresos por ventas',
            hint: 'Facturado del período (contado y crédito), neto de descuentos y devoluciones.',
            amount: formatUsd(summary.salesRevenueUsd),
            variant: 'line',
          },
          {
            id: 'cogs',
            label: 'Costo de mercancía vendida',
            hint: 'Costo de unidades vendidas (cantidad neta × costo).',
            amount: formatUsd(summary.cogsUsd),
            variant: 'deduction',
          },
          {
            id: 'gross',
            label: 'Utilidad bruta',
            hint: 'Ingresos por ventas − CMV.',
            amount: formatUsd(summary.grossProfitUsd),
            variant: 'subtotal',
          },
          {
            id: 'opex',
            label: 'Gastos operativos',
            hint: 'Egresos del período para operar.',
            amount: formatUsd(summary.operatingExpensesUsd),
            variant: 'deduction',
          },
          {
            id: 'operating',
            label: 'Utilidad operativa',
            hint: 'Utilidad bruta − gastos operativos.',
            amount: formatUsd(summary.operatingIncomeUsd),
            variant: 'total',
            emphasizeNegative: !isPositive,
          },
        ]}
      />
    </div>
  )
}

function HeroKpiCard({
  netLabel,
  currency,
  baseCurrencyCode,
  isPositive,
  grossMarginPct,
  operatingMarginPct,
}: {
  netLabel: string
  currency: string
  baseCurrencyCode: string
  isPositive: boolean
  grossMarginPct: number | null
  operatingMarginPct: number | null
}) {
  return (
    <div className={reportUi.hero}>
      <span
        aria-hidden
        className="report-hero-kpi-logo pointer-events-none absolute top-1/2 right-4 z-0 translate-y-[-50%] select-none text-right font-bold tracking-tight text-white/10"
      >
        <span className="block text-5xl sm:text-6xl">NEGA</span>
        <span className="block text-3xl font-light sm:text-4xl">POS</span>
      </span>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-neutral-950 via-neutral-950/92 to-neutral-950/25"
      />

      <div className="relative z-10 flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <TrendingUp className="size-5 text-white" />
          </div>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide',
              isPositive
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-red-400/30 bg-red-500/15 text-red-200'
            )}
          >
            {isPositive ? 'Ganancia' : 'Pérdida'}
          </span>
        </div>

        <div>
          <p className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
            Utilidad operativa
          </p>
          <p
            className={cn(
              'mt-1 text-4xl font-bold tracking-tight tabular-nums',
              isPositive ? 'text-white' : 'text-red-100'
            )}
          >
            {netLabel}
          </p>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-neutral-400">
            Resultado operativo a devengo: ingresos por ventas − CMV − gastos operativos (
            {baseCurrencyCode}, vista {currency}).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium tabular-nums text-neutral-300">
              Margen bruto {formatMarginPct(grossMarginPct)}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium tabular-nums text-neutral-300">
              Margen operativo {formatMarginPct(operatingMarginPct)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {isPositive ? (
            <ArrowUpRight className="size-4 text-white/70" />
          ) : (
            <ArrowDownLeft className="size-4 text-red-300/80" />
          )}
          Base de consolidación: {baseCurrencyCode} ({currencySymbol(baseCurrencyCode)})
        </div>
      </div>
    </div>
  )
}
