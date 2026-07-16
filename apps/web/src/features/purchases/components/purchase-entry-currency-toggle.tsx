import type { Currency } from '@/features/currencies/types'
import { currencySymbol } from '@/features/currencies/utils/convert-currency'
import { cn } from '@/lib/utils'

type PurchaseEntryCurrencyToggleProps = {
  currencies: Currency[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function PurchaseEntryCurrencyToggle({
  currencies,
  value,
  onChange,
  className,
}: PurchaseEntryCurrencyToggleProps) {
  const activeCurrencies = currencies.filter((currency) => currency.isActive)

  if (activeCurrencies.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'inline-flex max-w-full overflow-x-auto rounded-full bg-muted p-1',
        className
      )}
      title="Moneda de ingreso de precios"
    >
      {activeCurrencies.map((currency) => {
        const label = currencySymbol(currency.code)
        const isSelected = value === currency.code

        return (
          <button
            key={currency.code}
            type="button"
            onClick={() => onChange(currency.code)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all',
              isSelected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
