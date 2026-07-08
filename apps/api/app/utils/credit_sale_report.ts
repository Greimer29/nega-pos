import { DateTime } from 'luxon'

export type CreditSaleReportStatus = 'pending' | 'overdue' | 'settled'

export function creditSaleReportStatus(
  balanceUsd: number,
  creditDueDate: string | null,
  asOfDate: string = DateTime.now().toISODate()!
): CreditSaleReportStatus | null {
  if (!creditDueDate) {
    return null
  }

  if (balanceUsd > 0) {
    return creditDueDate < asOfDate ? 'overdue' : 'pending'
  }

  return 'settled'
}

export function creditSaleReportAmountUsd(balanceUsd: number): number {
  if (balanceUsd > 0) {
    return balanceUsd
  }

  return 0
}
