import type { BillingMethod } from '@/features/ventas/constants'
import { BILLING_METHODS } from '@/features/ventas/constants'
import { cn } from '@/lib/utils'

type VentasBillingMethodToggleProps = {
  value: BillingMethod
  onChange: (value: BillingMethod) => void
  className?: string
}

export function VentasBillingMethodToggle({
  value,
  onChange,
  className,
}: VentasBillingMethodToggleProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="bg-muted inline-flex rounded-lg p-1">
        {BILLING_METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              value === method.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onChange(method.value)}
          >
            {method.label}
          </button>
        ))}
      </div>
    </div>
  )
}
