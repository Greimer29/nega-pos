import { currencySymbol, formatMoneyLabel } from '@/features/currencies/utils/convert-currency'
import {
  isPurchaseEntryInNative,
  isValidPurchaseRate,
  usdToNative,
} from '@/features/purchases/utils/purchase-entry-currency'
import { cn } from '@/lib/utils'

type PrecioEnMonedaIngresoProps = {
  precioUsd: string | number | null | undefined
  precioNativo?: string | number | null
  entryCurrency: string
  baseCurrencyCode?: string
  rate?: number | null
  className?: string
  size?: 'sm' | 'md'
}

export function PrecioEnMonedaIngreso({
  precioUsd,
  precioNativo,
  entryCurrency,
  baseCurrencyCode = 'XAU',
  rate,
  className,
  size = 'md',
}: PrecioEnMonedaIngresoProps) {
  const baseNum =
    precioUsd !== null && precioUsd !== undefined && precioUsd !== ''
      ? Number(precioUsd)
      : NaN

  if (!Number.isFinite(baseNum)) {
    return <span className={className}>—</span>
  }

  const symbol = currencySymbol(entryCurrency)
  const entryInNative = isPurchaseEntryInNative(entryCurrency, baseCurrencyCode)

  const nativeAmount =
    precioNativo !== null && precioNativo !== undefined && precioNativo !== ''
      ? Number(precioNativo)
      : entryInNative && isValidPurchaseRate(rate)
        ? usdToNative(baseNum, rate, entryCurrency)
        : baseNum

  const primaryLabel = entryInNative
    ? formatMoneyLabel(nativeAmount, entryCurrency)
    : formatMoneyLabel(baseNum, baseCurrencyCode)
  const secondaryLabel = entryInNative
    ? formatMoneyLabel(baseNum, baseCurrencyCode)
    : null

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className={cn('font-medium tabular-nums', size === 'sm' ? 'text-sm' : 'text-base')}>
        {primaryLabel}
      </span>
      {secondaryLabel && secondaryLabel !== '—' ? (
        <span className="text-muted-foreground text-xs tabular-nums">{secondaryLabel}</span>
      ) : null}
      {entryInNative && !secondaryLabel ? (
        <span className="text-muted-foreground text-xs tabular-nums">
          {symbol} en moneda de ingreso
        </span>
      ) : null}
    </span>
  )
}
