import { useFormatMoney } from '@/features/currencies/context/display-currency-context'
import { cn } from '@/lib/utils'

type DisplayMoneyProps = {
  amount: string | number | null | undefined
  currencyCode: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showNative?: boolean
}

export function DisplayMoney({
  amount,
  currencyCode,
  className,
  size = 'md',
  showNative = false,
}: DisplayMoneyProps) {
  const { formatInDisplay, formatNative, displayCurrency } = useFormatMoney()

  if (amount === null || amount === undefined || amount === '') {
    return <span className={className}>—</span>
  }

  const num = Number(amount)
  if (!Number.isFinite(num)) {
    return <span className={className}>—</span>
  }

  const display = formatInDisplay(num, currencyCode)
  const native =
    showNative && currencyCode.toUpperCase() !== displayCurrency.toUpperCase()
      ? formatNative(amount, currencyCode)
      : null

  return (
    <span className={cn('inline-flex flex-col tabular-nums', className)}>
      <span
        className={cn(
          'font-medium',
          size === 'sm'
            ? 'text-sm'
            : size === 'lg'
              ? 'text-2xl font-semibold'
              : size === 'xl'
                ? 'text-4xl font-bold md:text-5xl'
                : 'text-base'
        )}
      >
        {display}
      </span>
      {native ? <span className="text-muted-foreground text-xs">{native}</span> : null}
    </span>
  )
}

type DisplayMoneyFromUsdProps = {
  amountUsd: string | number | null | undefined
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function DisplayMoneyFromUsd({
  amountUsd,
  className,
  size = 'md',
}: DisplayMoneyFromUsdProps) {
  const { formatFromUsd } = useFormatMoney()

  if (amountUsd === null || amountUsd === undefined || amountUsd === '') {
    return <span className={className}>—</span>
  }

  const num = Number(amountUsd)
  if (!Number.isFinite(num)) {
    return <span className={className}>—</span>
  }

  return (
    <span
      className={cn(
        'font-medium tabular-nums',
        size === 'sm'
          ? 'text-sm'
          : size === 'lg'
            ? 'text-2xl font-semibold'
            : size === 'xl'
              ? 'text-4xl font-bold md:text-5xl'
              : 'text-base',
        className
      )}
    >
      {formatFromUsd(num)}
    </span>
  )
}
