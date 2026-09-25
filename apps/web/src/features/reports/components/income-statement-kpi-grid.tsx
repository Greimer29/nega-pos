import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Percent,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { currencySymbol } from '@/features/reports/constants'
import { metricToneStyles, reportUi, type MetricTone } from '@/features/reports/report-ui'
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <HeroKpiCard
        netLabel={formatUsd(summary.operatingIncomeUsd)}
        currency={displayCurrency}
        baseCurrencyCode={baseCurrencyCode}
        isPositive={isPositive}
      />

      <MetricCard
        icon={ShoppingBag}
        label="Ingresos por ventas"
        value={formatUsd(summary.salesRevenueUsd)}
        detail="Ventas facturadas del período (contado y crédito), netas de descuento y devoluciones. Base a devengo."
        tone="income"
      />
      <MetricCard
        icon={Package}
        label="Costo de mercancía vendida"
        value={formatUsd(summary.cogsUsd)}
        detail="Costo de las unidades vendidas (cantidad neta × costo de línea o catálogo)."
        tone="purchase"
      />
      <MetricCard
        icon={TrendingUp}
        label="Utilidad bruta"
        value={formatUsd(summary.grossProfitUsd)}
        detail="Ingresos por ventas menos costo de mercancía vendida."
        tone="income"
      />
      <MetricCard
        icon={Receipt}
        label="Gastos operativos"
        value={formatUsd(summary.operatingExpensesUsd)}
        detail="Egresos del período para operar. No incluye compras de inventario ni aportes de capital."
        tone="expense"
      />
      <MetricCard
        icon={Percent}
        label="Margen bruto"
        value={formatMarginPct(summary.grossMarginPct)}
        detail="Utilidad bruta ÷ ingresos por ventas."
        tone="income"
      />
      <MetricCard
        icon={Percent}
        label="Margen operativo"
        value={formatMarginPct(summary.operatingMarginPct)}
        detail="Utilidad operativa ÷ ingresos por ventas."
        tone={isPositive ? 'income' : 'expense'}
      />
    </div>
  )
}

function HeroKpiCard({
  netLabel,
  currency,
  baseCurrencyCode,
  isPositive,
}: {
  netLabel: string
  currency: string
  baseCurrencyCode: string
  isPositive: boolean
}) {
  return (
    <div className={cn(reportUi.hero, 'sm:col-span-2 xl:col-span-2 xl:row-span-2')}>
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
            Ingresos por ventas − CMV − gastos operativos ({baseCurrencyCode}, vista {currency}).
            Informe a devengo: no es flujo de caja ni situación patrimonial.
          </p>
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

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail?: string
  tone: MetricTone
}) {
  const styles = metricToneStyles(tone)

  return (
    <div className={cn(reportUi.metricCard, 'cursor-default')}>
      <div className="flex items-start justify-between gap-3">
        <div className={styles.icon}>
          <Icon className="size-4" />
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', styles.tag)}>
          {styles.tagLabel}
        </span>
      </div>

      <div className="mt-4">
        <p className={reportUi.muted}>{label}</p>
        <p
          className={cn(
            'mt-1 text-2xl font-bold tracking-tight tabular-nums',
            tone === 'income'
              ? 'text-emerald-700'
              : tone === 'payable'
                ? 'text-amber-800'
                : 'text-neutral-900'
          )}
        >
          {value}
        </p>
        {detail ? <p className={`mt-1 ${reportUi.muted}`}>{detail}</p> : null}
      </div>
    </div>
  )
}
