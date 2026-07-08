import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { cn } from '@/lib/utils'

type DisplayCurrencyToggleProps = {
  className?: string
  size?: 'sm' | 'md'
}

export function DisplayCurrencyToggle({ className, size = 'sm' }: DisplayCurrencyToggleProps) {
  const { currencies, displayCurrency, setDisplayCurrency, isLoading } = useDisplayCurrency()

  if (isLoading && currencies.length === 0) {
    return null
  }

  const options = currencies.length > 0 ? currencies : [{ code: 'USD', name: 'USD' }]

  return (
    <div
      className={cn('inline-flex rounded-full bg-muted p-1', className)}
      title="Moneda de visualización"
    >
      {options.map((currency) => (
        <button
          key={currency.code}
          type="button"
          onClick={() => setDisplayCurrency(currency.code)}
          className={cn(
            'rounded-full font-medium transition-all',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            displayCurrency === currency.code
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {currency.code}
        </button>
      ))}
    </div>
  )
}
