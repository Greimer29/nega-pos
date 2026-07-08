import { MOVEMENT_TYPE_LABELS, formatMoney } from '@/features/reports/constants'
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { movementTheme, reportUi } from '@/features/reports/report-ui'
import type { AccountStatementMovement } from '@/features/reports/types'
import { cn } from '@/lib/utils'

type ReportFlowChartProps = {
  movements: AccountStatementMovement[]
}

export function ReportFlowChart({ movements }: ReportFlowChartProps) {
  const { displayCurrency } = useDisplayCurrency()

  const totals = movements.reduce<Record<AccountStatementMovement['type'], number>>(
    (acc, movement) => {
      acc[movement.type] = (acc[movement.type] ?? 0) + Number(movement.amountDisplay)
      return acc
    },
    { sale: 0, customer_payment: 0, purchase: 0, supplier_payment: 0, expense: 0, machine_expense: 0 }
  )

  const rows = (Object.keys(totals) as Array<AccountStatementMovement['type']>)
    .map((type) => ({ type, value: totals[type] }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)

  const max = rows[0]?.value ?? 0

  return (
    <div className={cn(reportUi.panel, 'p-5 md:p-6')}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className={reportUi.sectionTitle}>Flujo por categoría</h3>
          <p className={reportUi.muted}>Montos en {displayCurrency}</p>
        </div>
        <span className={reportUi.badge}>Período actual</span>
      </div>

      {rows.length === 0 ? (
        <p className={`${reportUi.body} py-10 text-center`}>Sin datos para graficar.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const width = max > 0 ? (row.value / max) * 100 : 0
            const theme = movementTheme[row.type]

            return (
              <div key={row.type} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: theme.bar }}
                    />
                    <span className="font-medium text-neutral-800">
                      {MOVEMENT_TYPE_LABELS[row.type]}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      row.type === 'sale' || row.type === 'customer_payment'
                        ? reportUi.income
                        : reportUi.expense
                    )}
                  >
                    {formatMoney(row.value, displayCurrency)}
                  </span>
                </div>
                <div className={reportUi.barTrack}>
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.33,0,0.2,1)]"
                    style={{
                      width: `${width}%`,
                      backgroundColor: theme.bar,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
