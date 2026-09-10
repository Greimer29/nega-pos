import { DateTime } from 'luxon'

export type CreditPurchaseReportContext = {
  isCredit: boolean
  purchaseDate: string
  creditDueDate: string | null
  balanceUsd: number
}

export type CreditPurchaseReportStatus = 'pending' | 'overdue' | 'settled'

export function creditPurchaseReportEffectiveDate(ctx: CreditPurchaseReportContext): string {
  if (ctx.isCredit && ctx.creditDueDate) {
    return ctx.creditDueDate
  }
  return ctx.purchaseDate
}

export function creditPurchaseReportStatus(
  ctx: CreditPurchaseReportContext,
  asOfDate: string = DateTime.now().toISODate()!
): CreditPurchaseReportStatus | null {
  if (!ctx.isCredit) {
    return null
  }

  if (ctx.balanceUsd <= 0) {
    return 'settled'
  }

  if (!ctx.creditDueDate) {
    return 'pending'
  }

  return ctx.creditDueDate < asOfDate ? 'overdue' : 'pending'
}

/**
 * Compras a crédito en reportes:
 * - Con saldo y vencimiento: visibles si el vencimiento es <= fin del período (incluye arrastre).
 * - Con saldo y sin vencimiento: visibles si la fecha de compra es <= fin del período.
 * - Saldadas con vencimiento: solo si el vencimiento cae dentro del período.
 * - Saldadas sin vencimiento: solo si la fecha de compra cae dentro del período.
 */
export function creditPurchaseVisibleInReport(
  ctx: CreditPurchaseReportContext,
  period: { from: string; to: string }
): boolean {
  if (!ctx.isCredit) {
    return ctx.purchaseDate >= period.from && ctx.purchaseDate <= period.to
  }

  const anchorDate = ctx.creditDueDate ?? ctx.purchaseDate

  if (ctx.balanceUsd > 0) {
    return anchorDate <= period.to
  }

  return anchorDate >= period.from && anchorDate <= period.to
}

export function creditPurchaseIsOverdue(
  creditDueDate: string | null,
  asOfDate: string = DateTime.now().toISODate()!
): boolean {
  if (!creditDueDate) {
    return false
  }
  return creditDueDate < asOfDate
}

export function creditPurchaseReportAmountUsd(ctx: CreditPurchaseReportContext): number {
  if (!ctx.isCredit) {
    return 0
  }

  if (ctx.balanceUsd > 0) {
    return ctx.balanceUsd
  }

  return 0
}

/**
 * La deuda a crédito no afecta flujo de caja: solo los abonos y compras de contado
 * suman a purchasesUsd / Balance neto.
 */
export function creditPurchaseCountsTowardPeriodTotal(
  _ctx: CreditPurchaseReportContext,
  _period: { from: string; to: string }
): boolean {
  return false
}
