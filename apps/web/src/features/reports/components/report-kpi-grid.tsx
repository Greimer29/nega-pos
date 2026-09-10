import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  ChevronRight,
  HandCoins,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { currencySymbol } from '@/features/reports/constants'
import { reportCategoryHref } from '@/features/reports/report-categories'
import { metricToneStyles, reportUi, type MetricTone } from '@/features/reports/report-ui'
import type { AccountStatementSummary } from '@/features/reports/types'
import { formatReportDisplayAmount } from '@/features/reports/utils/format-report-amount'
import { cn } from '@/lib/utils'

type ReportKpiGridProps = {
  summary: AccountStatementSummary
  filterSearch: string
}

export function ReportKpiGrid({ summary, filterSearch }: ReportKpiGridProps) {
  const { displayCurrency, formatFromUsd, baseCurrencyCode } = useDisplayCurrency()
  const netUsd = Number(summary.netUsd)
  const isPositive = netUsd >= 0
  const formatUsd = (amountUsd: string) => formatReportDisplayAmount(amountUsd, formatFromUsd)
  const overduePayablesUsd = Number(summary.overduePayablesUsd ?? 0)
  const pendingPayablesDetail =
    overduePayablesUsd > 0
      ? `${formatUsd(summary.overduePayablesUsd)} vencidas`
      : 'No resta del balance neto'

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <HeroKpiCard
        netLabel={formatUsd(summary.netUsd)}
        currency={displayCurrency}
        baseCurrencyCode={baseCurrencyCode}
        isPositive={isPositive}
      />

      <MetricCard
        icon={ArrowUpRight}
        label="Ingresos (ventas)"
        value={formatUsd(summary.salesUsd)}
        tone="income"
        href={reportCategoryHref('ventas', filterSearch)}
      />
      <MetricCard
        icon={ArrowDownToLine}
        label="Ingresos (aportes)"
        value={formatUsd(summary.incomesUsd ?? '0')}
        tone="income"
        href={reportCategoryHref('ingresos', filterSearch)}
      />
      <MetricCard
        icon={ShoppingCart}
        label="Egresos compras"
        value={formatUsd(summary.purchasesUsd)}
        tone="purchase"
        href={reportCategoryHref('compras', filterSearch)}
      />
      <MetricCard
        icon={HandCoins}
        label="Cuentas por pagar"
        value={formatUsd(summary.pendingPayablesUsd ?? '0')}
        detail={pendingPayablesDetail}
        tone="payable"
        href={reportCategoryHref('compras', filterSearch)}
      />
      <MetricCard
        icon={Receipt}
        label="Gastos empresa"
        value={formatUsd(summary.expensesUsd)}
        tone="expense"
        href={reportCategoryHref('gastos', filterSearch)}
      />
      <MetricCard
        icon={Wrench}
        label="Gastos máquina"
        value={formatUsd(summary.machineExpensesUsd)}
        tone="machine"
        href={reportCategoryHref('maquina', filterSearch)}
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

            {isPositive ? 'Superávit' : 'Déficit'}

          </span>

        </div>



        <div>

          <p className="text-sm font-medium tracking-wide text-neutral-400 uppercase">

            Balance neto

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
            Flujo de caja en {baseCurrencyCode} (visualización {currency}). La deuda a crédito de
            proveedores se muestra aparte y no resta este balance hasta el abono.
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

  href,

}: {

  icon: LucideIcon

  label: string

  value: string

  detail?: string

  tone: MetricTone

  href: string

}) {

  const styles = metricToneStyles(tone)



  return (

    <Link to={href} className={reportUi.metricCard}>

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

        {detail ? <p className={`mt-1 ${reportUi.muted} tabular-nums`}>{detail}</p> : null}

      </div>



      <p className="mt-4 flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors duration-500 ease-out group-hover:text-neutral-700">

        Ver historial

        <ChevronRight className="size-3.5 transition-transform duration-500 ease-out group-hover:translate-x-0.5" />

      </p>

    </Link>

  )

}


