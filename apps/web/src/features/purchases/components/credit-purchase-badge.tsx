import { formatFecha } from '@/features/purchases/constants'
import { cn } from '@/lib/utils'

type CreditPurchaseBadgeProps = {
  creditDueDate: string | null
  reportStatus?: 'pending' | 'overdue' | 'settled'
  compact?: boolean
  className?: string
}

function resolveStatus(
  creditDueDate: string | null,
  reportStatus?: CreditPurchaseBadgeProps['reportStatus']
): 'pending' | 'overdue' | 'settled' {
  if (reportStatus) {
    return reportStatus
  }

  if (!creditDueDate) {
    return 'settled'
  }

  const today = new Date().toISOString().slice(0, 10)
  return creditDueDate < today ? 'overdue' : 'pending'
}

export function CreditPurchaseBadge({
  creditDueDate,
  reportStatus,
  compact = false,
  className,
}: CreditPurchaseBadgeProps) {
  const status = resolveStatus(creditDueDate, reportStatus)

  const label =
    status === 'overdue'
      ? compact
        ? 'Vencido'
        : 'Crédito vencido'
      : status === 'pending'
        ? compact
          ? 'Pendiente'
          : 'Crédito pendiente'
        : compact
          ? 'Crédito'
          : 'Crédito'

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
