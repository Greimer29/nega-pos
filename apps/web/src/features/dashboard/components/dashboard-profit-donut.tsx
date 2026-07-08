import { cn } from '@/lib/utils'

type DashboardProfitDonutProps = {
  percent: number
  size?: number
  className?: string
  ariaLabel?: string
}

export function DashboardProfitDonut({
  percent,
  size = 60,
  className,
  ariaLabel,
}: DashboardProfitDonutProps) {
  const strokeWidth = Math.round((size / 60) * 6)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, Math.abs(percent)))
  const offset = circumference - (clamped / 100) * circumference
  const isNegative = percent < 0

  const label = `${percent.toFixed(1)}%`

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `Ganancia ${label} sobre ventas del día`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={isNegative ? 'text-red-300' : 'text-emerald-300'}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'font-semibold tabular-nums text-white',
            size >= 90 ? 'text-xs' : 'text-[10px]'
          )}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
