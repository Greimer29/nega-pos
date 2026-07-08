import { currencySymbol } from '@/features/reports/constants'

/** Monto original tal como se registró (sin convertir). */
export function formatReportOriginalAmount(
  amountNative: string,
  currencyCode: string,
  formatNative: (amount: string | number | null | undefined, currencyCode: string) => string
) {
  return formatNative(amountNative, currencyCode)
}

/** Monto convertido a la moneda de visualización del header. */
export function formatReportDisplayAmount(
  amountUsd: string | number | null | undefined,
  formatFromUsd: (amountUsd: number) => string
) {
  if (amountUsd === null || amountUsd === undefined || amountUsd === '') {
    return '—'
  }
  const num = Number(amountUsd)
  if (!Number.isFinite(num)) {
    return '—'
  }
  return formatFromUsd(num)
}

export { currencySymbol }
