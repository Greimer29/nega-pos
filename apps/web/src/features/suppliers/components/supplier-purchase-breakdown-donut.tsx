import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { cn } from '@/lib/utils'

type SupplierPurchaseBreakdownDonutProps = {
  totalUsd: number
  pagadoUsd: number
  creditoUsd: number
  size?: number
  compact?: boolean
  className?: string
}

export function SupplierPurchaseBreakdownDonut({
  totalUsd,
  pagadoUsd,
  creditoUsd,
  size = 140,
  compact = false,
  className,
}: SupplierPurchaseBreakdownDonutProps) {
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  const safeTotal = totalUsd > 0 ? totalUsd : pagadoUsd + creditoUsd
  const paidShare = safeTotal > 0 ? pagadoUsd / safeTotal : 0
  const creditShare = safeTotal > 0 ? creditoUsd / safeTotal : 0

  const paidLength = paidShare * circumference
  const creditLength = creditShare * circumference

  return (
    <div
      className={cn(
        compact ? 'flex w-full min-w-0 flex-col items-center gap-2' : 'flex flex-col items-center gap-4',
        className
      )}
    >
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Total comprado ${totalUsd.toFixed(2)} USD. Pagado ${pagadoUsd.toFixed(2)}. Crédito pendiente ${creditoUsd.toFixed(2)}.`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
          />
          {paidLength > 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${paidLength} ${circumference - paidLength}`}
              className="text-sky-300"
            />
          ) : null}
          {creditLength > 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${creditLength} ${circumference - creditLength}`}
              strokeDashoffset={-paidLength}
              className="text-white/60"
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <span className="text-[10px] font-medium text-white/70">Total</span>
          <DisplayMoneyFromUsd
            amountUsd={safeTotal}
            className={cn(
              'leading-tight font-bold text-white',
              compact ? 'text-xs' : 'text-sm md:text-base'
            )}
          />
        </div>
      </div>

      <div className={cn('flex w-full flex-col gap-2', compact ? 'text-[10px]' : 'text-xs')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-white/70">
            <span className={cn('shrink-0 rounded-sm bg-sky-300', compact ? 'size-2' : 'size-2.5')} />
            <span className="truncate">Pagado</span>
          </div>
          <DisplayMoneyFromUsd
            amountUsd={pagadoUsd}
            className={cn('shrink-0 font-medium text-white', compact ? 'text-[10px]' : 'text-xs')}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-white/70">
            <span
              className={cn('shrink-0 rounded-sm bg-white/60', compact ? 'size-2' : 'size-2.5')}
            />
            <span className="truncate">Crédito</span>
          </div>
          <DisplayMoneyFromUsd
            amountUsd={creditoUsd}
            className={cn('shrink-0 font-medium text-white', compact ? 'text-[10px]' : 'text-xs')}
          />
        </div>
      </div>
    </div>
  )
}
