import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  ChevronRight,
  HandCoins,
  Landmark,
  Receipt,
  ShoppingCart,
  Store,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { reportCategoryHref } from '@/features/reports/report-categories'
import { metricToneStyles, reportUi, type MetricTone } from '@/features/reports/report-ui'
import type { AccountStatementSummary } from '@/features/reports/types'
import { formatReportDisplayAmount } from '@/features/reports/utils/format-report-amount'
import { cn } from '@/lib/utils'

type ReportFinanceBlocksProps = {
  summary: AccountStatementSummary
  filterSearch: string
  accountFilterActive: boolean
}

export function ReportFinanceBlocks({
  summary,
  filterSearch,
  accountFilterActive,
}: ReportFinanceBlocksProps) {
  const { displayCurrency, formatFromUsd, baseCurrencyCode } = useDisplayCurrency()
  const formatUsd = (amountUsd: string) => formatReportDisplayAmount(amountUsd, formatFromUsd)

  const productLeft = Number(summary.productLeftUsd ?? 0)
  const businessLeft = Number(summary.businessLeftUsd ?? 0)
  const cashMoved = Number(summary.netUsd)
  const ownerIn = Number(summary.incomesUsd ?? 0)
  const soldOnCredit = Number(summary.soldOnCreditUsd ?? 0)
  const missingCost = Number(summary.salesWithoutCostCount ?? 0)
  const missingLines = Number(summary.salesWithoutLinesCount ?? 0)
  const overduePayablesUsd = Number(summary.overduePayablesUsd ?? 0)

  return (
    <div className="space-y-5">
      <p className={reportUi.body}>
        Estos números no se mezclan.{' '}
        <span className="font-medium text-neutral-800">“Dejó”</span> no es{' '}
        <span className="font-medium text-neutral-800">“hay en caja”</span>.
      </p>

      {accountFilterActive ? (
        <p className={cn(reportUi.muted, 'rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3')}>
          El filtro de cuenta solo cambia la caja y el listado. Lo que dejó el producto y lo que
          costó la tienda son de todo el negocio en el período.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className={reportUi.sectionTitle}>El negocio</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <StoryHero
            eyebrow="El producto dejó"
            amount={formatUsd(summary.productLeftUsd ?? '0')}
            positive={productLeft >= 0}
            hint="Esto es lo que dejó la mercadería. No es lo que hay en el cajón."
            currencyNote={`${baseCurrencyCode} · vista ${displayCurrency}`}
          />
          <MetricCard
            icon={Store}
            label="La tienda costó"
            value={formatUsd(summary.storeCostUsd ?? '0')}
            detail="Solo gastos. No incluye compras de stock."
            tone="expense"
            href={reportCategoryHref('gastos', filterSearch)}
          />
          <MetricCard
            icon={Wallet}
            label="Del negocio quedó"
            value={formatUsd(summary.businessLeftUsd ?? '0')}
            detail={
              businessLeft < 0
                ? 'La mercadería dejó menos de lo que costó abrir.'
                : 'Producto dejó menos lo que costó la tienda.'
            }
            tone={businessLeft >= 0 ? 'income' : 'expense'}
            href={reportCategoryHref('ventas', filterSearch)}
            tagOverride={businessLeft >= 0 ? 'Quedó' : 'No alcanzó'}
          />
        </div>
        {soldOnCredit > 0 ? (
          <p className={reportUi.muted}>
            Incluye fiado ({formatUsd(summary.soldOnCreditUsd)}): se vendió, todavía no se cobró.
          </p>
        ) : null}
        {missingCost > 0 || missingLines > 0 ? (
          <p className={cn(reportUi.muted, 'text-amber-800')}>
            Hay ventas sin costo
            {missingLines > 0 ? ' o sin ítems' : ''}. El “dejó” puede estar inflado.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className={reportUi.sectionTitle}>La caja</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StoryHero
            eyebrow="Plata que se movió"
            amount={formatUsd(summary.netUsd)}
            positive={cashMoved >= 0}
            hint="No es ganancia. Es lo que entró menos lo que salió."
            extra={
              ownerIn > 0
                ? `De la caja, ${formatUsd(summary.incomesUsd)} los pusiste vos. Eso no lo ganó el negocio.`
                : `Caja sin tu plata: ${formatUsd(summary.cashWithoutOwnerUsd ?? summary.netUsd)}.`
            }
            currencyNote={`${baseCurrencyCode} · vista ${displayCurrency}`}
          />
          <MetricCard
            icon={ArrowUpRight}
            label="Cobraste"
            value={formatUsd(summary.salesUsd)}
            detail="Contado y abonos. El fiado no suma hasta que pagan."
            tone="income"
            href={reportCategoryHref('ventas', filterSearch)}
            tagOverride="Cobrado"
          />
          <MetricCard
            icon={ShoppingCart}
            label="Pagaste mercadería"
            value={formatUsd(summary.purchasesUsd)}
            detail="Comprar stock no es perder: es cambiar plata por mercadería."
            tone="purchase"
            href={reportCategoryHref('compras', filterSearch)}
            tagOverride="Reposición"
          />
          <MetricCard
            icon={Receipt}
            label="Pagaste la tienda"
            value={formatUsd(summary.expensesUsd)}
            tone="expense"
            href={reportCategoryHref('gastos', filterSearch)}
          />
          <MetricCard
            icon={ArrowDownToLine}
            label="Vos metiste"
            value={formatUsd(summary.incomesUsd ?? '0')}
            detail="Aporte de tu bolsillo. No es venta."
            tone="owner"
            href={reportCategoryHref('ingresos', filterSearch)}
            tagOverride="Tu plata"
          />
          <MetricCard
            icon={Landmark}
            label="Caja sin tu plata"
            value={formatUsd(summary.cashWithoutOwnerUsd ?? '0')}
            detail="La caja del período quitando lo que metiste vos."
            tone="payable"
            href={reportCategoryHref('ingresos', filterSearch)}
            tagOverride="Caja"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={reportUi.sectionTitle}>Te deben / debés</h2>
        <p className={reportUi.muted}>
          No entra en “el producto dejó” ni en “la caja”. Es plata pendiente.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            icon={HandCoins}
            label="Te deben"
            value={formatUsd(summary.openReceivablesUsd ?? '0')}
            detail="Ventas a crédito con saldo."
            tone="income"
            href={reportCategoryHref('ventas', filterSearch)}
            tagOverride="Por cobrar"
          />
          <MetricCard
            icon={HandCoins}
            label="Debés"
            value={formatUsd(summary.pendingPayablesUsd ?? '0')}
            detail={
              overduePayablesUsd > 0
                ? `${formatUsd(summary.overduePayablesUsd)} vencidas. No resta la caja hasta el abono.`
                : 'No resta la caja hasta el abono.'
            }
            tone="payable"
            href={reportCategoryHref('compras', filterSearch)}
            tagOverride="Por pagar"
          />
        </div>
      </section>
    </div>
  )
}

function StoryHero({
  eyebrow,
  amount,
  positive,
  hint,
  extra,
  currencyNote,
}: {
  eyebrow: string
  amount: string
  positive: boolean
  hint: string
  extra?: string
  currencyNote: string
}) {
  return (
    <div className={cn(reportUi.hero, 'lg:col-span-1')}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-neutral-950 via-neutral-950/92 to-neutral-950/25"
      />
      <div className="relative z-10 flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium tracking-wide text-neutral-400 uppercase">{eyebrow}</p>
          {positive ? (
            <ArrowUpRight className="size-4 text-white/70" />
          ) : (
            <ArrowDownLeft className="size-4 text-red-300/80" />
          )}
        </div>
        <p
          className={cn(
            'text-4xl font-bold tracking-tight tabular-nums',
            positive ? 'text-white' : 'text-red-100'
          )}
        >
          {amount}
        </p>
        <div className="space-y-2">
          <p className="max-w-md text-xs leading-relaxed text-neutral-400">{hint}</p>
          {extra ? <p className="max-w-md text-xs leading-relaxed text-amber-200/90">{extra}</p> : null}
          <p className="text-xs text-neutral-500">{currencyNote}</p>
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
  tagOverride,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail?: string
  tone: MetricTone
  href: string
  tagOverride?: string
}) {
  const styles = metricToneStyles(tone)

  return (
    <Link to={href} className={reportUi.metricCard}>
      <div className="flex items-start justify-between gap-3">
        <div className={styles.icon}>
          <Icon className="size-4" />
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', styles.tag)}>
          {tagOverride ?? styles.tagLabel}
        </span>
      </div>
      <div className="mt-4">
        <p className={reportUi.muted}>{label}</p>
        <p
          className={cn(
            'mt-1 text-2xl font-bold tracking-tight tabular-nums',
            tone === 'income'
              ? 'text-emerald-700'
              : tone === 'payable' || tone === 'owner'
                ? 'text-amber-800'
                : 'text-neutral-900'
          )}
        >
          {value}
        </p>
        {detail ? <p className={`mt-1 ${reportUi.muted}`}>{detail}</p> : null}
      </div>
      <p className="mt-4 flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors duration-500 ease-out group-hover:text-neutral-700">
        Ver historial
        <ChevronRight className="size-3.5 transition-transform duration-500 ease-out group-hover:translate-x-0.5" />
      </p>
    </Link>
  )
}
