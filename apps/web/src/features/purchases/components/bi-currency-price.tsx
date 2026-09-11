import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { formatMoneyLabel, fromBase, toUsd } from '@/features/currencies/utils/convert-currency'
import { cn } from '@/lib/utils'

type PrecioBimonetarioProps = {
  precioUsd: string | number | null | undefined
  precioBs?: string | number | null
  className?: string
  size?: 'sm' | 'md'
  showNative?: boolean
}

export function counterpartLabel(
  amountBase: number,
  displayCurrency: string,
  rates: Record<string, number>,
  baseCurrencyCode: string
): string | null {
  const other = displayCurrency === 'USD' ? 'VES' : displayCurrency === 'VES' ? 'USD' : null
  if (!other) return null
  return formatMoneyLabel(fromBase(amountBase, other, rates, baseCurrencyCode), other)
}

export function PrecioBimonetario({
  precioUsd,
  precioBs,
  className,
  size = 'md',
  showNative = true,
}: PrecioBimonetarioProps) {
  const { formatFromUsd, displayCurrency, rates, baseCurrencyCode } = useDisplayCurrency()

  const usdNum =
    precioUsd !== null && precioUsd !== undefined && precioUsd !== ''
      ? Number(precioUsd)
      : precioBs !== null && precioBs !== undefined && precioBs !== ''
        ? toUsd(Number(precioBs), 'VES', rates)
        : NaN

  if (!Number.isFinite(usdNum)) {
    return <span className={className}>—</span>
  }

  const display = formatFromUsd(usdNum)
  const secondary = showNative ? counterpartLabel(usdNum, displayCurrency, rates, baseCurrencyCode) : null

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className={cn('font-medium tabular-nums', size === 'sm' ? 'text-sm' : 'text-base')}>
        {display}
      </span>
      {secondary ? (
        <span className="text-muted-foreground text-xs tabular-nums">{secondary}</span>
      ) : null}
    </span>
  )
}
