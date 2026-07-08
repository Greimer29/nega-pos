import { useEffect } from 'react'
import { useActiveCurrenciesQuery } from '@/features/currencies/hooks/use-currencies'
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
  /** Solo USD para altas/ediciones de montos. */
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

  useEffect(() => {
    if (registrationOnly && value !== 'USD') {
      onChange('USD')
    }
  }, [registrationOnly, value, onChange])

  if (registrationOnly) {
    const legacyNonUsd = value !== 'USD'

    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={id}>{label}</Label>
        <div
          id={id}
          className="border-input bg-muted text-muted-foreground flex h-9 w-full items-center rounded-md border px-3 text-sm"
        >
          USD — Dólar estadounidense ($)
        </div>
        <p className="text-muted-foreground text-xs">{MONETARY_REGISTRATION_USD_HINT}</p>
        {legacyNonUsd ? (
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
