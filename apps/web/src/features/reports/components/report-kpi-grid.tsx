import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  ChevronRight,
  HandCoins,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
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
      ? `${formatUsd(summary.overduePayablesUsd)} vencidas. Saldo con proveedores; no forma parte del flujo de caja hasta el abono.`
      : 'Saldo pendiente con proveedores. No forma parte del flujo de caja hasta el abono.'
  const overdueReceivablesUsd = Number(summary.overdueReceivablesUsd ?? 0)
  const pendingReceivablesDetail =
    overdueReceivablesUsd > 0
      ? `${formatUsd(summary.overdueReceivablesUsd)} vencidas. Saldo de clientes; no forma parte del flujo de caja hasta el cobro.`
      : 'Saldo pendiente de clientes. No forma parte del flujo de caja hasta el cobro.'

  const showMachine = Number(summary.machineExpensesUsd) > 0

  const renderHero = () => (
    <HeroKpiCard
      netLabel={formatUsd(summary.netUsd)}
      currency={displayCurrency}
      baseCurrencyCode={baseCurrencyCode}
      isPositive={isPositive}
    />
  )

  const renderCobros = () => (
    <MetricCard
      icon={ArrowUpRight}
      label="Cobros por ventas"
      value={formatUsd(summary.salesUsd)}
      detail="Efectivo recibido por ventas de contado y abonos de clientes. No incluye el fiado pendiente (CxC)."
      tone="income"
      href={reportCategoryHref('ventas', filterSearch)}
    />
  )

  const renderAportes = () => (
    <MetricCard
      icon={ArrowDownToLine}
      label="Aportes de capital"
      value={formatUsd(summary.incomesUsd ?? '0')}
      detail="Entradas del titular u otros socios. Incrementan el efectivo y el patrimonio; no son ingresos por ventas ni utilidad."
      tone="income"
      href={reportCategoryHref('ingresos', filterSearch)}
    />
  )

  const renderPagos = () => (
    <MetricCard
      icon={ShoppingCart}
      label="Pagos a proveedores"
      value={formatUsd(summary.purchasesUsd)}
      detail="Incluye compras de contado y abonos. El inventario permanece en la empresa; no es un gasto operativo."
      tone="purchase"
      href={reportCategoryHref('compras', filterSearch)}
    />
  )

  const renderCxc = () => (
    <MetricCard
      icon={Users}
      label="Cuentas por cobrar"
      value={formatUsd(summary.pendingReceivablesUsd ?? '0')}
      detail={pendingReceivablesDetail}
      tone="income"
      href={reportCategoryHref('ventas', filterSearch)}
    />
  )

  const renderCxp = () => (
    <MetricCard
      icon={HandCoins}
      label="Cuentas por pagar"
      value={formatUsd(summary.pendingPayablesUsd ?? '0')}
      detail={pendingPayablesDetail}
      tone="payable"
      href={reportCategoryHref('compras', filterSearch)}
    />
  )

  const renderGastos = () => (
    <MetricCard
      icon={Receipt}
      label="Gastos operativos"
      value={formatUsd(summary.expensesUsd)}
      detail="Egresos del período para operar (alquiler, servicios, nómina, etc.). No incluyen compras de inventario."
      tone="expense"
      href={reportCategoryHref('gastos', filterSearch)}
    />
  )

  const renderMachine = () =>
    showMachine ? (
      <MetricCard
        icon={Wrench}
        label="Gastos máquina (histórico)"
        value={formatUsd(summary.machineExpensesUsd)}
        tone="machine"
        href={reportCategoryHref('maquina', filterSearch)}
      />
    ) : null

  return (
    <>
      {/* Móvil / tablet: grid original */}
      <div className="grid gap-4 sm:grid-cols-2 xl:hidden">
        <div className="sm:col-span-2">{renderHero()}</div>
        {renderCobros()}
        {renderAportes()}
        {renderPagos()}
        {renderCxc()}
        {renderCxp()}
        {renderGastos()}
        {renderMachine()}
      </div>

      {/* Desktop grande: fila 1 (hero 3/4 | cobros+pagos 1/4) + fila 2 (4 cards) */}
      <div className="hidden space-y-4 xl:block">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3 min-h-0 [&>*]:h-full">{renderHero()}</div>
          <div className="col-span-1 grid h-full min-h-0 grid-rows-2 gap-4">
            {renderCobros()}
            {renderPagos()}
          </div>
        </div>
        <div className={cn('grid gap-4', showMachine ? 'grid-cols-5' : 'grid-cols-4')}>
          {renderAportes()}
          {renderCxc()}
          {renderCxp()}
          {renderGastos()}
          {renderMachine()}
        </div>
      </div>
    </>
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
            {isPositive ? 'Entró más' : 'Salió más'}
          </span>
        </div>

        <div>
          <p className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
            Flujo de caja
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
            Entradas menos salidas en este período ({baseCurrencyCode}, vista {currency}). No
            representa el saldo total de la empresa ni la utilidad. Las deudas a crédito no se
            descuentan hasta el pago.
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
    <Link to={href} className={cn(reportUi.metricCard, 'h-full min-h-0')}>
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
