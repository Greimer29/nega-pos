import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { currencySymbol, formatFecha } from '@/features/reports/constants'
import { ReportStatementCascade } from '@/features/reports/components/report-statement-cascade'
import { reportUi } from '@/features/reports/report-ui'
import type { BalancePositionSummary } from '@/features/reports/types'
import { formatReportDisplayAmount } from '@/features/reports/utils/format-report-amount'
import { cn } from '@/lib/utils'

type BalancePositionSummaryViewProps = {
  summary: BalancePositionSummary
  asOf: string
}

export function BalancePositionSummaryView({ summary, asOf }: BalancePositionSummaryViewProps) {
  const { displayCurrency, formatFromUsd, baseCurrencyCode } = useDisplayCurrency()
  const equityUsd = Number(summary.estimatedEquityUsd)
  const isPositive = equityUsd >= 0
  const formatUsd = (amountUsd: string) => formatReportDisplayAmount(amountUsd, formatFromUsd)

  return (
    <div className="space-y-4">
      <HeroCard
        equityLabel={formatUsd(summary.estimatedEquityUsd)}
        capitalLabel={formatUsd(summary.capitalContributionsUsd)}
        currency={displayCurrency}
        baseCurrencyCode={baseCurrencyCode}
        isPositive={isPositive}
        asOf={asOf}
      />

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <ReportStatementCascade
          title="Activo"
          subtitle="Lo que la empresa tiene hoy."
          ariaLabel="Activo"
          rows={[
            {
              id: 'inventory',
              label: 'Inventario valorizado',
              hint: 'Stock a costo (productos sin fórmula + materiales).',
              amount: formatUsd(summary.inventoryUsd),
              variant: 'line',
            },
            {
              id: 'receivables',
              label: 'Cuentas por cobrar',
              hint: 'Saldos abiertos de ventas a crédito.',
              amount: formatUsd(summary.receivablesUsd),
              variant: 'line',
            },
            {
              id: 'machines',
              label: 'Máquinas',
              hint: 'Costo de adquisición registrado.',
              amount: formatUsd(summary.machinesUsd),
              variant: 'line',
            },
            {
              id: 'total-assets',
              label: 'Total activo',
              hint: 'Inventario + CxC + máquinas.',
              amount: formatUsd(summary.totalAssetsUsd),
              variant: 'total',
            },
          ]}
        />

        <ReportStatementCascade
          title="Pasivo"
          subtitle="Lo que la empresa debe hoy."
          ariaLabel="Pasivo"
          rows={[
            {
              id: 'payables',
              label: 'Cuentas por pagar',
              hint: 'Saldos abiertos de compras a crédito.',
              amount: formatUsd(summary.payablesUsd),
              variant: 'line',
            },
            {
              id: 'total-liabilities',
              label: 'Total pasivo',
              hint: 'Deuda con proveedores.',
              amount: formatUsd(summary.totalLiabilitiesUsd),
              variant: 'total',
            },
          ]}
        />
      </div>
    </div>
  )
}

function HeroCard({
  equityLabel,
  capitalLabel,
  currency,
  baseCurrencyCode,
  isPositive,
  asOf,
}: {
  equityLabel: string
  capitalLabel: string
  currency: string
  baseCurrencyCode: string
  isPositive: boolean
  asOf: string
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
            <Scale className="size-5 text-white" />
          </div>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide',
              isPositive
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-red-400/30 bg-red-500/15 text-red-200'
            )}
          >
            {isPositive ? 'Positivo' : 'Negativo'}
          </span>
        </div>

        <div>
          <p className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
            Patrimonio estimado
          </p>
          <p
            className={cn(
              'mt-1 text-4xl font-bold tracking-tight tabular-nums',
              isPositive ? 'text-white' : 'text-red-100'
            )}
          >
            {equityLabel}
          </p>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-neutral-400">
            Activo − Pasivo al {formatFecha(asOf)} ({baseCurrencyCode}, vista {currency}).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium tabular-nums text-neutral-300">
              Aportes acumulados {capitalLabel}
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
