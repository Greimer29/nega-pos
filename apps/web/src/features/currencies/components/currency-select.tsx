import { useEffect } from 'react'
import {
  useActiveCurrenciesQuery,
  useBaseCurrencyQuery,
} from '@/features/currencies/hooks/use-currencies'
import {
  MONETARY_REGISTRATION_USD_HINT,
  MONETARY_REGISTRATION_USD_MESSAGE,
} from '@/features/currencies/constants'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type CurrencySelectProps = {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  /** Solo moneda base para altas/ediciones de montos canónicos. */
  registrationOnly?: boolean
}

export function CurrencySelect({
  id = 'currency_code',
  label = 'Moneda',
  value,
  onChange,
  disabled,
  className,
  registrationOnly = false,
}: CurrencySelectProps) {
  const { data: currencies = [], isLoading } = useActiveCurrenciesQuery()
  const { data: baseCurrencyCode = 'XAU' } = useBaseCurrencyQuery()

  useEffect(() => {
    if (registrationOnly && value !== baseCurrencyCode) {
      onChange(baseCurrencyCode)
    }
  }, [registrationOnly, value, onChange, baseCurrencyCode])

  if (registrationOnly) {
    const baseCurrency = currencies.find((c) => c.code === baseCurrencyCode)
    const legacyNonBase = value !== baseCurrencyCode

    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={id}>{label}</Label>
        <div
          id={id}
          className="border-input bg-muted text-muted-foreground flex h-9 w-full items-center rounded-md border px-3 text-sm"
        >
          {baseCurrencyCode}
          {baseCurrency ? ` — ${baseCurrency.name}` : ''}
        </div>
        <p className="text-muted-foreground text-xs">{MONETARY_REGISTRATION_USD_HINT}</p>
        {legacyNonBase ? (
          <p className="text-destructive text-sm">{MONETARY_REGISTRATION_USD_MESSAGE}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        disabled={disabled || isLoading}
        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {currencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code} — {currency.name}
          </option>
        ))}
      </select>
    </div>
  )
}
