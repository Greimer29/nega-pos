import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { currencySymbol, formatFecha } from '@/features/reports/constants'
import { ReportStatementCascade } from '@/features/reports/components/report-statement-cascade'
import { reportUi } from '@/features/reports/report-ui'
import type { FinancialSummaryData } from '@/features/reports/types'
import { formatReportDisplayAmount } from '@/features/reports/utils/format-report-amount'
import { cn } from '@/lib/utils'

type FinancialSummaryViewProps = {
  data: FinancialSummaryData
}

function formatMarginPct(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—'
  return `${value.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} %`
}

export function FinancialSummaryView({ data }: FinancialSummaryViewProps) {
  const { displayCurrency, formatFromUsd, baseCurrencyCode } = useDisplayCurrency()
  const formatUsd = (amountUsd: string) => formatReportDisplayAmount(amountUsd, formatFromUsd)
  const opIncome = Number(data.resultado.operatingIncomeUsd)
  const cashFlow = Number(data.flujo.netUsd)
  const equity = Number(data.patrimonio.estimatedEquityUsd)

  return (
    <div className="space-y-4">
      <DiagnosisHero
        diagnosis={data.diagnosis}
        periodFrom={data.period.from}
        periodTo={data.period.to}
        asOf={data.asOf}
        currency={displayCurrency}
        baseCurrencyCode={baseCurrencyCode}
        operatingIncomeLabel={formatUsd(data.resultado.operatingIncomeUsd)}
        cashFlowLabel={formatUsd(data.flujo.netUsd)}
        equityLabel={formatUsd(data.patrimonio.estimatedEquityUsd)}
        operatingIncomeUsd={opIncome}
        cashFlowUsd={cashFlow}
        equityUsd={equity}
        grossMarginPct={data.resultado.grossMarginPct}
        operatingMarginPct={data.resultado.operatingMarginPct}
      />

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <ReportStatementCascade
          title="Resultado"
          subtitle="A devengo en el período."
          ariaLabel="Resultado del período"
          rows={[
            {
              id: 'sales',
              label: 'Ingresos por ventas',
              hint: 'Facturado (contado y crédito).',
              amount: formatUsd(data.resultado.salesRevenueUsd),
              variant: 'line',
            },
            {
              id: 'cogs',
              label: 'Costo de mercancía vendida',
              hint: 'Costo de lo vendido.',
              amount: formatUsd(data.resultado.cogsUsd),
              variant: 'deduction',
            },
            {
              id: 'gross',
              label: 'Utilidad bruta',
              hint: 'Ventas − CMV.',
              amount: formatUsd(data.resultado.grossProfitUsd),
              variant: 'subtotal',
            },
            {
              id: 'opex',
              label: 'Gastos operativos',
              hint: 'Egresos para operar.',
              amount: formatUsd(data.resultado.operatingExpensesUsd),
              variant: 'deduction',
            },
            {
              id: 'operating',
              label: 'Utilidad operativa',
              hint: 'Bruta − gastos.',
              amount: formatUsd(data.resultado.operatingIncomeUsd),
              variant: 'total',
              emphasizeNegative: opIncome < 0,
            },
          ]}
        />

        <ReportStatementCascade
          title="Caja"
          subtitle="Entradas y salidas del período."
          ariaLabel="Flujo de caja"
          rows={[
            {
              id: 'collections',
              label: 'Cobros por ventas',
              hint: 'Contado + abonos.',
              amount: formatUsd(data.flujo.salesUsd),
              variant: 'line',
            },
            {
              id: 'capital',
              label: 'Aportes de capital',
              hint: 'Entradas del titular.',
              amount: formatUsd(data.flujo.incomesUsd),
              variant: 'line',
            },
            {
              id: 'suppliers',
              label: 'Pagos a proveedores',
              hint: 'Contado + abonos.',
              amount: formatUsd(data.flujo.purchasesUsd),
              variant: 'deduction',
            },
            {
              id: 'cash-opex',
              label: 'Gastos operativos',
              hint: 'Salidas de caja por gastos.',
              amount: formatUsd(data.flujo.expensesUsd),
              variant: 'deduction',
            },
            {
              id: 'net-cash',
              label: 'Flujo de caja',
              hint: 'Entradas − salidas.',
              amount: formatUsd(data.flujo.netUsd),
              variant: 'total',
              emphasizeNegative: cashFlow < 0,
            },
          ]}
        />

        <ReportStatementCascade
          title="Situación"
          subtitle={`Foto al ${formatFecha(data.asOf)}.`}
          ariaLabel="Situación patrimonial"
          rows={[
            {
              id: 'assets',
              label: 'Total activo',
              hint: 'Inventario + CxC + máquinas.',
              amount: formatUsd(data.patrimonio.totalAssetsUsd),
              variant: 'line',
            },
            {
              id: 'liabilities',
              label: 'Total pasivo',
              hint: 'Cuentas por pagar.',
              amount: formatUsd(data.patrimonio.totalLiabilitiesUsd),
              variant: 'deduction',
            },
            {
              id: 'equity',
              label: 'Patrimonio estimado',
              hint: 'Activo − Pasivo.',
              amount: formatUsd(data.patrimonio.estimatedEquityUsd),
              variant: 'total',
              emphasizeNegative: equity < 0,
            },
          ]}
        />
      </div>

      <ReportStatementCascade
        title="Puentes"
        subtitle="Explican diferencias entre resultado, caja y patrimonio."
        ariaLabel="Puentes financieros"
        rows={[
          {
            id: 'receivables',
            label: 'Cuentas por cobrar',
            hint: 'Facturado a crédito aún no cobrado.',
            amount: formatUsd(data.patrimonio.receivablesUsd),
            variant: 'line',
          },
          {
            id: 'payables',
            label: 'Cuentas por pagar',
            hint: 'Compras a crédito aún no pagadas.',
            amount: formatUsd(data.patrimonio.payablesUsd),
            variant: 'line',
          },
          {
            id: 'contributions',
            label: 'Aportes acumulados',
            hint: 'Capital inyectado (histórico).',
            amount: formatUsd(data.patrimonio.capitalContributionsUsd),
            variant: 'line',
          },
          {
            id: 'contrast',
            label: 'Utilidad vs flujo',
            hint:
              opIncome === cashFlow
                ? 'Resultado y caja coinciden en el período.'
                : 'Si difieren: crédito, inventario o aportes.',
            amount: formatUsd((opIncome - cashFlow).toFixed(4)),
            variant: 'total',
          },
        ]}
      />

      <p className={`${reportUi.muted} px-1`}>
        Márgenes: bruto {formatMarginPct(data.resultado.grossMarginPct)} · operativo{' '}
        {formatMarginPct(data.resultado.operatingMarginPct)}
      </p>
    </div>
  )
}

function DiagnosisHero({
  diagnosis,
  periodFrom,
  periodTo,
  asOf,
  currency,
  baseCurrencyCode,
  operatingIncomeLabel,
  cashFlowLabel,
  equityLabel,
  operatingIncomeUsd,
  cashFlowUsd,
  equityUsd,
  grossMarginPct,
  operatingMarginPct,
}: {
  diagnosis: FinancialSummaryData['diagnosis']
  periodFrom: string
  periodTo: string
  asOf: string
  currency: string
  baseCurrencyCode: string
  operatingIncomeLabel: string
  cashFlowLabel: string
  equityLabel: string
  operatingIncomeUsd: number
  cashFlowUsd: number
  equityUsd: number
  grossMarginPct: number | null
  operatingMarginPct: number | null
}) {
  const toneBorder =
    diagnosis.tone === 'positive'
      ? 'border-white/20 bg-white/10 text-white'
      : diagnosis.tone === 'caution'
        ? 'border-amber-400/30 bg-amber-500/15 text-amber-100'
        : 'border-red-400/30 bg-red-500/15 text-red-200'

  const toneLabel =
    diagnosis.tone === 'positive'
      ? 'Favorable'
      : diagnosis.tone === 'caution'
        ? 'Atención'
        : 'Adverso'

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

      <div className="relative z-10 flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
              Resumen financiero
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {formatFecha(periodFrom)} — {formatFecha(periodTo)} · situación al {formatFecha(asOf)}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide',
              toneBorder
            )}
          >
            {toneLabel}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <HeroMetric
            label="Utilidad operativa"
            value={operatingIncomeLabel}
            negative={operatingIncomeUsd < 0}
          />
          <HeroMetric
            label="Flujo de caja"
            value={cashFlowLabel}
            negative={cashFlowUsd < 0}
          />
          <HeroMetric
            label="Patrimonio estimado"
            value={equityLabel}
            negative={equityUsd < 0}
          />
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-sm font-medium text-white">{diagnosis.headline}</p>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-400">
            {diagnosis.detail}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 tabular-nums">
              Margen bruto {formatMarginPct(grossMarginPct)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 tabular-nums">
              Margen operativo {formatMarginPct(operatingMarginPct)}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-neutral-500">
              {diagnosis.tone === 'negative' ? (
                <ArrowDownLeft className="size-3.5 text-red-300/80" />
              ) : (
                <ArrowUpRight className="size-3.5 text-white/70" />
              )}
              Base {baseCurrencyCode} ({currencySymbol(baseCurrencyCode)}) · vista {currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroMetric({
  label,
  value,
  negative,
}: {
  label: string
  value: string
  negative: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] font-medium tracking-wide text-neutral-400 uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold tracking-tight tabular-nums md:text-3xl',
          negative ? 'text-red-100' : 'text-white'
        )}
      >
        {value}
      </p>
    </div>
  )
}
