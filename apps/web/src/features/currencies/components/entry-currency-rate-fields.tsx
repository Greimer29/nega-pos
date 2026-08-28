import type { ReactNode } from 'react'
import { DecimalInput } from '@/components/decimal-input'
import { Label } from '@/components/ui/label'
import { PurchaseEntryCurrencyToggle } from '@/features/purchases/components/purchase-entry-currency-toggle'
import {
  useActiveCurrenciesQuery,
  useBaseCurrencyQuery,
} from '@/features/currencies/hooks/use-currencies'
import { currencySymbol } from '@/features/currencies/utils/convert-currency'
import {
  entryRateLabel,
  isPurchaseEntryInNative,
  isValidPurchaseRate,
} from '@/features/purchases/utils/purchase-entry-currency'
import { cn } from '@/lib/utils'

export type EntryCurrencyRateFieldsProps = {
  currencyCode: string
  onCurrencyChange: (code: string) => void
  rate: string
  onRateChange: (rate: string) => void
  className?: string
  /** Optional preview line under the rate (e.g. base equivalent). */
  preview?: ReactNode
  id?: string
}

export function EntryCurrencyRateFields({
  currencyCode,
  onCurrencyChange,
  rate,
  onRateChange,
  className,
  preview,
  id = 'entry_rate',
}: EntryCurrencyRateFieldsProps) {
  const { data: currencies = [] } = useActiveCurrenciesQuery()
  const { data: baseCurrencyCode = 'XAU' } = useBaseCurrencyQuery()
  const entryInNative = isPurchaseEntryInNative(currencyCode, baseCurrencyCode)
  const symbol = currencySymbol(currencyCode)
  const rateNum = Number(rate)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>
          {entryRateLabel(currencyCode, symbol, baseCurrencyCode)}
        </Label>
        <PurchaseEntryCurrencyToggle
          currencies={currencies}
          value={currencyCode}
          onChange={onCurrencyChange}
        />
      </div>
      {entryInNative ? (
        <>
          <DecimalInput
            id={id}
            min="0"
            decimals={4}
            placeholder="Ej. 36.50"
            className="w-full"
            value={rate}
            onChange={(e) => onRateChange(e.target.value)}
          />
          {!isValidPurchaseRate(rateNum) ? (
            <p className="text-muted-foreground text-xs">
              Cargá la tasa para ingresar en {symbol}.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              La tasa queda en este documento; no modifica Configuración.
            </p>
          )}
          {preview}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Los montos se ingresan en la moneda base ({baseCurrencyCode}).
        </p>
      )}
    </div>
  )
}

/** Catalog rate string for a currency code, or empty. */
export function catalogRateForCurrency(
  currencies: Array<{ code: string; ratePerUsd: string }>,
  code: string
): string {
  const found = currencies.find((c) => c.code.toUpperCase() === code.toUpperCase())
  if (!found) return ''
  const n = Number(found.ratePerUsd)
  return Number.isFinite(n) && n > 0 ? String(n) : ''
}
