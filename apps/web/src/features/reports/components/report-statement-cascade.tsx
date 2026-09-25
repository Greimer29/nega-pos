import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

export type StatementRowVariant = 'line' | 'deduction' | 'subtotal' | 'total'

export type StatementRow = {
  id: string
  label: string
  hint: string
  amount: string
  variant: StatementRowVariant
  emphasizeNegative?: boolean
}

type ReportStatementCascadeProps = {
  title: string
  subtitle?: string
  ariaLabel: string
  rows: StatementRow[]
}

export function ReportStatementCascade({
  title,
  subtitle,
  ariaLabel,
  rows,
}: ReportStatementCascadeProps) {
  return (
    <div className={cn(reportUi.panel, 'overflow-hidden')}>
      <div className="border-b border-neutral-200 px-5 py-4 md:px-6">
        <h2 className={reportUi.sectionTitle}>{title}</h2>
        {subtitle ? <p className={`${reportUi.muted} mt-1`}>{subtitle}</p> : null}
      </div>

      <div role="table" aria-label={ariaLabel}>
        {rows.map((row) => {
          const isDeduction = row.variant === 'deduction'
          const isSubtotal = row.variant === 'subtotal'
          const isTotal = row.variant === 'total'

          return (
            <div
              key={row.id}
              role="row"
              className={cn(
                'flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-3.5 last:border-b-0 md:px-6',
                isSubtotal && 'bg-neutral-50',
                isTotal && 'border-t border-neutral-200 bg-neutral-50/80'
              )}
            >
              <div className={cn('min-w-0', isDeduction && 'pl-3 md:pl-5')}>
                <p
                  className={cn(
                    'text-sm text-neutral-700',
                    (isSubtotal || isTotal) && 'font-semibold text-neutral-900',
                    isTotal && 'text-base'
                  )}
                >
                  {isDeduction ? <span className="text-neutral-400">(−) </span> : null}
                  {row.label}
                </p>
                <p className={`mt-0.5 ${reportUi.muted}`}>{row.hint}</p>
              </div>
              <p
                className={cn(
                  'shrink-0 text-right text-sm tabular-nums text-neutral-900',
                  (isSubtotal || isTotal) && 'font-semibold',
                  isTotal && 'text-base',
                  row.emphasizeNegative && 'text-red-600'
                )}
              >
                {isDeduction ? `− ${row.amount}` : row.amount}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
