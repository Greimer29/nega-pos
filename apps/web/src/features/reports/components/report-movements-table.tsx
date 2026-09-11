import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CreditPurchaseBadge } from '@/features/purchases/components/credit-purchase-badge'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { MOVEMENT_TYPE_LABELS, formatFecha } from '@/features/reports/constants'
import {
  formatReportDisplayAmount,
  formatReportOriginalAmount,
} from '@/features/reports/utils/format-report-amount'
import { ReportMovementsTotals } from '@/features/reports/components/report-movements-totals'
import type { ReportMovementCategorySlug } from '@/features/reports/report-categories'
import { computeMovementPeriodTotals } from '@/features/reports/utils/movement-period-totals'
import { movementTheme, reportUi } from '@/features/reports/report-ui'
import type { AccountStatementMovement } from '@/features/reports/types'
import { cn } from '@/lib/utils'

const PER_PAGE = 20
/** ~20 filas de ~64px + thead; scroll interno si las filas son más altas. */
const TABLE_BODY_MAX_HEIGHT = 'min(32rem, 70vh)'

type SortKey = 'label' | 'date' | 'payment' | 'original' | 'account' | 'amount'
type SortDir = 'asc' | 'desc'

function movementLink(movement: AccountStatementMovement): string | null {
  switch (movement.type) {
    case 'sale':
      return `/ventas/${movement.referenceId}`
    case 'customer_payment':
      return movement.customerId ? `/customers/${movement.customerId}` : null
    case 'supplier_payment':
      return movement.supplierId ? `/suppliers/${movement.supplierId}` : null
    case 'purchase':
      return `/purchases/${movement.referenceId}`
    case 'machine_expense':
      return `/machines`
    case 'expense':
      return `/purchases?tab=gastos`
    case 'income':
      return `/purchases?tab=ingresos`
    default:
      return null
  }
}

function paymentSortValue(movement: AccountStatementMovement): string {
  if (movement.type === 'purchase') {
    if (movement.isCreditPurchase) {
      return `credit:${movement.creditReportStatus ?? 'pending'}:${movement.creditDueDate ?? ''}`
    }
    return 'cash'
  }
  if (movement.type === 'sale') {
    if (movement.isCreditSale) {
      return `credit:${movement.creditReportStatus ?? 'pending'}:${movement.creditDueDate ?? ''}`
    }
    return 'cash'
  }
  if (movement.type === 'customer_payment') return 'abono'
  if (movement.type === 'supplier_payment') return 'pago'
  return ''
}

function amountSortValue(movement: AccountStatementMovement): number {
  const isCreditBalance =
    (movement.type === 'sale' && movement.isCreditSale) ||
    (movement.type === 'purchase' && movement.isCreditPurchase)
  if (isCreditBalance) {
    return Number(movement.creditBalanceUsd ?? movement.amountUsd)
  }
  const usd = Number(movement.amountUsd)
  return movement.isIncome ? usd : -usd
}

function compareMovements(
  a: AccountStatementMovement,
  b: AccountStatementMovement,
  sortKey: SortKey,
  sortDir: SortDir
): number {
  let cmp = 0
  switch (sortKey) {
    case 'label':
      cmp = a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
      break
    case 'date':
      cmp = a.date.localeCompare(b.date)
      if (cmp === 0) cmp = a.id - b.id
      break
    case 'payment':
      cmp = paymentSortValue(a).localeCompare(paymentSortValue(b), 'es')
      break
    case 'original':
      cmp = Number(a.amountNative) - Number(b.amountNative)
      break
    case 'account':
      cmp = (a.account?.name ?? '').localeCompare(b.account?.name ?? '', 'es', {
        sensitivity: 'base',
      })
      break
    case 'amount':
      cmp = amountSortValue(a) - amountSortValue(b)
      break
  }
  return sortDir === 'asc' ? cmp : -cmp
}

function PaymentTypeCell({ movement }: { movement: AccountStatementMovement }) {
  if (movement.type === 'purchase') {
    if (movement.isCreditPurchase) {
      return (
        <CreditPurchaseBadge
          creditDueDate={movement.creditDueDate ?? null}
          reportStatus={movement.creditReportStatus}
        />
      )
    }

    return (
      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
        Contado
      </span>
    )
  }

  if (movement.type === 'sale') {
    if (movement.isCreditSale) {
      return (
        <CreditPurchaseBadge
          creditDueDate={movement.creditDueDate ?? null}
          reportStatus={movement.creditReportStatus}
        />
      )
    }

    return (
      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
        Contado
      </span>
    )
  }

  if (movement.type === 'customer_payment') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        Abono
      </span>
    )
  }

  if (movement.type === 'supplier_payment') {
    return (
      <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900">
        Pago
      </span>
    )
  }

  return <span className={reportUi.muted}>—</span>
}

function SortableTh({
  label,
  sortKey,
  activeKey,
  sortDir,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = activeKey === sortKey
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown

  return (
    <th
      className={cn(
        'sticky top-0 z-10 bg-neutral-50 px-5 py-3 font-semibold',
        align === 'right' && 'text-right'
      )}
    >
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 hover:text-neutral-900',
          align === 'right' && 'ml-auto',
          active ? 'text-neutral-900' : reportUi.muted
        )}
        onClick={() => onSort(sortKey)}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <Icon className="size-3.5 opacity-70" aria-hidden />
      </button>
    </th>
  )
}

type ReportMovementsTableProps = {
  movements: AccountStatementMovement[]
  title?: string
  subtitle?: string
  categorySlug?: ReportMovementCategorySlug
}

export function ReportMovementsTable({
  movements,
  title = 'Historial de movimientos',
  subtitle,
  categorySlug,
}: ReportMovementsTableProps) {
  const { displayCurrency, formatFromUsd, formatNative } = useDisplayCurrency()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const periodTotals = useMemo(
    () => (categorySlug ? computeMovementPeriodTotals(movements, categorySlug) : null),
    [movements, categorySlug]
  )

  const sorted = useMemo(() => {
    const copy = [...movements]
    copy.sort((a, b) => compareMovements(a, b, sortKey, sortDir))
    return copy
  }, [movements, sortKey, sortDir])

  const lastPage = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const currentPage = Math.min(page, lastPage)

  const pageSlice = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE
    return sorted.slice(start, start + PER_PAGE)
  }, [sorted, currentPage])

  useEffect(() => {
    setPage(1)
  }, [movements, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'date' || key === 'amount' || key === 'original' ? 'desc' : 'asc')
  }

  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const rangeEnd = Math.min(currentPage * PER_PAGE, sorted.length)

  return (
    <div className={cn(reportUi.panel, 'overflow-hidden p-0')}>
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4',
          reportUi.divider
        )}
      >
        <div>
          <h3 className={reportUi.sectionTitle}>{title}</h3>
          {subtitle ? <p className={reportUi.muted}>{subtitle}</p> : null}
          {movements.length > 0 ? (
            <p className={cn(reportUi.muted, subtitle ? 'mt-1' : undefined)}>
              Mostrando {rangeStart}–{rangeEnd} de {sorted.length} · {displayCurrency}
            </p>
          ) : null}
          {periodTotals && categorySlug ? (
            <p className={`${reportUi.muted} mt-1 max-w-xl`}>
              Los totales del encabezado reflejan flujo de caja y saldos; la columna Monto puede
              mostrar montos informativos en ventas o compras a crédito.
            </p>
          ) : null}
        </div>
        {periodTotals && categorySlug ? (
          <ReportMovementsTotals
            totals={periodTotals}
            categorySlug={categorySlug}
            formatFromUsd={formatFromUsd}
          />
        ) : null}
      </div>

      {movements.length === 0 ? (
        <p className={`${reportUi.body} px-5 py-12 text-center`}>
          No hay movimientos para los filtros seleccionados.
        </p>
      ) : (
        <>
          <div
            className="scrollbar-subtle overflow-auto"
            style={{ maxHeight: TABLE_BODY_MAX_HEIGHT }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={cn(
                    'border-b bg-neutral-50 text-left text-xs',
                    reportUi.divider,
                    reportUi.muted
                  )}
                >
                  <SortableTh
                    label="Concepto"
                    sortKey="label"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Fecha"
                    sortKey="date"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Pago"
                    sortKey="payment"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Original"
                    sortKey="original"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Cuenta"
                    sortKey="account"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Monto"
                    sortKey="amount"
                    activeKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((movement) => {
                  const href = movementLink(movement)
                  const theme = movementTheme[movement.type] ?? movementTheme.sale
                  const typeLabel = MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type

                  const isCreditBalanceMovement =
                    (movement.type === 'sale' && movement.isCreditSale) ||
                    (movement.type === 'purchase' && movement.isCreditPurchase)

                  return (
                    <tr
                      key={`${movement.type}-${movement.id}`}
                      className={cn(
                        'border-b bg-white transition-colors last:border-b-0',
                        reportUi.divider,
                        reportUi.rowHover
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                              theme.badge
                            )}
                          >
                            {typeLabel.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">
                              {href ? (
                                <Link
                                  to={href}
                                  className="inline-flex items-center gap-1 hover:text-neutral-600 hover:underline"
                                >
                                  {movement.label}
                                  <ArrowUpRight className="size-3 opacity-50" />
                                </Link>
                              ) : (
                                movement.label
                              )}
                            </p>
                            <p className={reportUi.muted}>{typeLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-5 py-4 whitespace-nowrap ${reportUi.muted}`}>
                        {formatFecha(movement.date)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <PaymentTypeCell movement={movement} />
                      </td>
                      <td className={`px-5 py-4 tabular-nums whitespace-nowrap ${reportUi.body}`}>
                        {formatReportOriginalAmount(
                          movement.amountNative,
                          movement.currencyCode,
                          formatNative
                        )}
                      </td>
                      <td className={`px-5 py-4 ${reportUi.muted}`}>
                        {movement.account?.name ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={cn(
                            'tabular-nums',
                            isCreditBalanceMovement
                              ? reportUi.muted
                              : movement.isIncome
                                ? reportUi.income
                                : reportUi.expense
                          )}
                        >
                          {isCreditBalanceMovement ? (
                            movement.creditReportStatus === 'settled' ||
                            Number(movement.creditBalanceUsd ?? movement.amountUsd) === 0 ? (
                              'Saldado'
                            ) : (
                              <>
                                Saldo{' '}
                                {formatReportDisplayAmount(
                                  movement.creditBalanceUsd ?? movement.amountUsd,
                                  formatFromUsd
                                )}
                              </>
                            )
                          ) : (
                            <>
                              {movement.isIncome ? '+' : '−'}{' '}
                              {formatReportDisplayAmount(movement.amountUsd, formatFromUsd)}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {lastPage > 1 ? (
            <div className="flex items-center justify-between border-t px-5 py-3">
              <p className="text-muted-foreground text-sm">
                Página {currentPage} de {lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
