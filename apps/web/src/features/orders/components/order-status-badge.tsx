import type { OrderEstado } from '@/features/orders/types'
import { ESTADO_LABELS } from '@/features/orders/constants'
import { cn } from '@/lib/utils'

const ESTADO_STYLES: Record<OrderEstado, string> = {
  DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  IN_PRODUCTION: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  DELIVERED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  CANCELLED: 'bg-muted text-muted-foreground',
  RETURNED: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
}

export function OrderEstadoBadge({ status }: { status: OrderEstado }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        ESTADO_STYLES[status]
      )}
    >
      {ESTADO_LABELS[status]}
    </span>
  )
}
