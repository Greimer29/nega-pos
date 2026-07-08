import { ArrowUpRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CreditPurchaseBadge } from '@/features/purchases/components/credit-purchase-badge'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import {
  MOVEMENT_TYPE_LABELS,
  formatFecha,
} from '@/features/reports/constants'
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
    default:
      return null
  }
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

  const periodTotals = useMemo(
    () => (categorySlug ? computeMovementPeriodTotals(movements, categorySlug) : null),
    [movements, categorySlug]
  )

  const meta =
    subtitle ??
    `${movements.length} registro${movements.length === 1 ? '' : 's'} · mostrado en ${displayCurrency}`

  return (
    <div className={cn(reportUi.panel, 'overflow-hidden p-0')}>
      <div className={cn('flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4', reportUi.divider)}>
        <div>
          <h3 className={reportUi.sectionTitle}>{title}</h3>
          <p className={reportUi.muted}>{meta}</p>
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
        <div className="scrollbar-subtle overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn('border-b bg-neutral-50 text-left text-xs', reportUi.divider, reportUi.muted)}>
                <th className="px-5 py-3 font-semibold">Concepto</th>
                <th className="px-5 py-3 font-semibold">Fecha</th>
                <th className="px-5 py-3 font-semibold">Pago</th>
                <th className="px-5 py-3 font-semibold">Original</th>
                <th className="px-5 py-3 font-semibold">Cuenta</th>
                <th className="px-5 py-3 text-right font-semibold">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const href = movementLink(movement)
                const theme = movementTheme[movement.type] ?? movementTheme.sale
                const typeLabel = MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type

                const isCreditBalanceMovement =
                  (movement.type === 'sale' && movement.isCreditSale) ||
                  (movement.type === 'purchase' && movement.isCreditPurchase)

                return (
                  <tr
                    key={`${movement.type}-${movement.id}`}
                    className={cn('border-b bg-white transition-colors last:border-b-0', reportUi.divider, reportUi.rowHover)}
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
      )}
    </div>
  )
}
