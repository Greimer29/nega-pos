import { useFormatMoney } from '@/features/currencies/context/display-currency-context'
import { toUsd } from '@/features/currencies/utils/convert-currency'
import { cn } from '@/lib/utils'

type PrecioBimonetarioProps = {
  precioUsd: string | number | null | undefined
  precioBs?: string | number | null
  className?: string
  size?: 'sm' | 'md'
  showNative?: boolean
}

export function PrecioBimonetario({
  precioUsd,
  precioBs,
  className,
  size = 'md',
  showNative = true,
}: PrecioBimonetarioProps) {
  const { formatFromUsd, formatNative, displayCurrency, rates } = useFormatMoney()

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
  const nativeUsd =
    showNative && precioUsd !== null && precioUsd !== undefined && precioUsd !== ''
      ? formatNative(precioUsd, 'USD')
      : null
  const nativeBs =
    showNative && precioBs !== null && precioBs !== undefined && precioBs !== ''
      ? formatNative(precioBs, 'VES')
      : null
  const showSecondary =
    showNative &&
    displayCurrency !== 'USD' &&
    displayCurrency !== 'VES' &&
    (nativeUsd || nativeBs)

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className={cn('font-medium tabular-nums', size === 'sm' ? 'text-sm' : 'text-base')}>
        {display}
      </span>
      {displayCurrency === 'USD' && nativeBs && nativeBs !== '—' ? (
        <span className="text-muted-foreground text-xs tabular-nums">{nativeBs}</span>
      ) : null}
      {displayCurrency === 'VES' && nativeUsd && nativeUsd !== '—' ? (
        <span className="text-muted-foreground text-xs tabular-nums">{nativeUsd}</span>
      ) : null}
      {showSecondary ? (
        <span className="text-muted-foreground text-xs tabular-nums">
          {[nativeUsd, nativeBs].filter(Boolean).join(' · ')}
        </span>
      ) : null}
    </span>
  )
}
