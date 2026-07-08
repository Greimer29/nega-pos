import { formatReportDisplayAmount } from '@/features/reports/utils/format-report-amount'
import type { ReportMovementCategorySlug } from '@/features/reports/report-categories'
import { reportUi } from '@/features/reports/report-ui'
import type { MovementPeriodTotals } from '@/features/reports/utils/movement-period-totals'
import { cn } from '@/lib/utils'

type ReportMovementsTotalsProps = {
  totals: MovementPeriodTotals
  categorySlug: ReportMovementCategorySlug
  formatFromUsd: (amountUsd: number) => string
}

export function ReportMovementsTotals({
  totals,
  categorySlug,
  formatFromUsd,
}: ReportMovementsTotalsProps) {
  if (totals.kind === 'single') {
    return (
      <div className="text-right">
        <p className={reportUi.muted}>Total filtrado</p>
        <p className={cn('text-base font-semibold tabular-nums', amountClassName(categorySlug, 'primary'))}>
          {formatReportDisplayAmount(totals.totalUsd, formatFromUsd)}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-4 sm:justify-end">
      <div className="text-right">
        <p className={reportUi.muted}>Contado</p>
        <p className={cn('text-base font-semibold tabular-nums', amountClassName(categorySlug, 'primary'))}>
          {formatReportDisplayAmount(totals.cashUsd, formatFromUsd)}
        </p>
      </div>
      <div className="text-right">
        <p className={reportUi.muted}>Crédito pendiente</p>
        <p className="text-base font-semibold tabular-nums text-amber-800">
          {formatReportDisplayAmount(totals.pendingCreditUsd, formatFromUsd)}
        </p>
      </div>
    </div>
  )
}

function amountClassName(
  categorySlug: ReportMovementCategorySlug,
  variant: 'primary' | 'pending'
) {
  if (variant === 'pending') {
    return 'text-amber-800'
  }

  if (categorySlug === 'ventas') {
    return reportUi.income
  }

  return reportUi.expense
}
