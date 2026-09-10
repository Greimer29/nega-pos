import { formatFecha } from '@/features/purchases/constants'
import { cn } from '@/lib/utils'

type CreditPurchaseBadgeProps = {
  creditDueDate: string | null
  /** Saldo pendiente USD. Si es ≤ 0, la compra a crédito se considera pagada. */
  balanceUsd?: string | number | null
  reportStatus?: 'pending' | 'overdue' | 'settled'
  compact?: boolean
  className?: string
}

function resolveStatus(
  creditDueDate: string | null,
  balanceUsd?: string | number | null,
  reportStatus?: CreditPurchaseBadgeProps['reportStatus']
): 'pending' | 'overdue' | 'settled' {
  if (reportStatus) {
    return reportStatus
  }

  if (balanceUsd !== undefined && balanceUsd !== null) {
    if (Number(balanceUsd) <= 0) {
      return 'settled'
    }
    if (!creditDueDate) {
      return 'pending'
    }
  } else if (!creditDueDate) {
    return 'settled'
  }

  const today = new Date().toISOString().slice(0, 10)
  return creditDueDate < today ? 'overdue' : 'pending'
}

export function CreditPurchaseBadge({
  creditDueDate,
  balanceUsd,
  reportStatus,
  compact = false,
  className,
}: CreditPurchaseBadgeProps) {
  const status = resolveStatus(creditDueDate, balanceUsd, reportStatus)

  const label =
    status === 'overdue'
      ? compact
        ? 'Vencido'
        : 'Crédito vencido'
      : status === 'pending'
        ? compact
          ? 'Por pagar'
          : 'Crédito pendiente'
        : compact
          ? 'Pagada'
          : 'Crédito pagado'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'overdue'
          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
          : status === 'pending'
            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
            : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
        className
      )}
      title={
        creditDueDate
          ? `Compra a crédito · Vence ${formatFecha(creditDueDate)}`
          : 'Compra a crédito'
      }
    >
      {label}
      {!compact && creditDueDate ? ` · ${formatFecha(creditDueDate)}` : null}
    </span>
  )
}
