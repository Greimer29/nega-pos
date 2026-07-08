import type { PurchaseEntryCurrency } from '@/features/purchases/utils/purchase-entry-currency'
import { cn } from '@/lib/utils'

type PurchaseEntryCurrencyToggleProps = {
  value: PurchaseEntryCurrency
  onChange: (value: PurchaseEntryCurrency) => void
  className?: string
}

const OPTIONS: Array<{ value: PurchaseEntryCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'VES', label: 'Bs' },
]

export function PurchaseEntryCurrencyToggle({
  value,
  onChange,
  className,
}: PurchaseEntryCurrencyToggleProps) {
  return (
    <div
      className={cn('inline-flex rounded-full bg-muted p-1', className)}
      title="Moneda de ingreso de precios"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-all',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
