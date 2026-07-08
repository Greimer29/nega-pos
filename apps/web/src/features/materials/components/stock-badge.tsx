import { cn } from '@/lib/utils'

type StockBadgeProps = {
  stockActual: number
  stockMinimo: number
  unitLabel: string
  className?: string
  variant?: 'default' | 'subtitle' | 'compact'
}

export function StockBadge({
  stockActual,
  stockMinimo,
  unitLabel,
  className,
  variant = 'default',
}: StockBadgeProps) {
  const status =
    stockActual <= 0 ? 'empty' : stockActual < stockMinimo ? 'low' : 'ok'

  const labels = {
    empty: 'Sin stock',
    low: 'Bajo stock',
    ok: 'OK',
  }

  const styles = {
    empty: 'bg-red-100 text-red-800',
    low: 'bg-amber-100 text-amber-900',
    ok: 'bg-emerald-100 text-emerald-800',
  }

  const statusBadgeClass = cn(
    'inline-flex items-center justify-center rounded-full px-2 text-xs font-medium',
    styles[status]
  )

  if (variant === 'subtitle') {
    return (
      <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
        <span className="text-muted-foreground tabular-nums">
          Stock: {stockActual} {unitLabel}
        </span>
        <span className={cn(statusBadgeClass, 'py-0.5 text-[10px] uppercase tracking-wide')}>
          {labels[status]}
        </span>
      </span>
    )
  }

  if (variant === 'compact') {
    return (
      <>
        <span className={cn('font-medium tabular-nums', className)}>
          {stockActual} {unitLabel}
        </span>
        <span className={cn(statusBadgeClass, 'h-[30px] w-fit py-px')}>{labels[status]}</span>
      </>
    )
  }

  return (
    <span className={cn('grid h-[30px] grid-cols-2 grid-rows-1 items-center gap-2', className)}>
      <span className="font-medium tabular-nums">
        {stockActual} {unitLabel}
      </span>
      <span className={cn(statusBadgeClass, 'h-[30px] w-fit py-px')}>{labels[status]}</span>
    </span>
  )
}
