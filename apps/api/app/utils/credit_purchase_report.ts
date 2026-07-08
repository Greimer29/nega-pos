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
  if (!ctx.isCredit || !ctx.creditDueDate) {
    return null
  }

  if (ctx.balanceUsd > 0) {
    return ctx.creditDueDate < asOfDate ? 'overdue' : 'pending'
  }

  return 'settled'
}

/**
 * Compras a crédito en reportes:
 * - Pendientes/vencidas con saldo: aparecen si el vencimiento es <= fin del período (incluye arrastre a meses posteriores).
 * - Saldadas: solo si el vencimiento cae dentro del período filtrado.
 */
export function creditPurchaseVisibleInReport(
  ctx: CreditPurchaseReportContext,
  period: { from: string; to: string }
): boolean {
  if (!ctx.isCredit) {
    return ctx.purchaseDate >= period.from && ctx.purchaseDate <= period.to
  }

  if (!ctx.creditDueDate) {
    return false
  }

  if (ctx.balanceUsd > 0) {
    return ctx.creditDueDate <= period.to
  }

  return ctx.creditDueDate >= period.from && ctx.creditDueDate <= period.to
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
 * Créditos impagos visibles por arrastre en meses posteriores al vencimiento
 * no deben volver a sumar en purchasesUsd: solo cuentan en el mes del vencimiento.
 */
export function creditPurchaseCountsTowardPeriodTotal(
  ctx: CreditPurchaseReportContext,
  period: { from: string; to: string }
): boolean {
  if (!ctx.isCredit || ctx.balanceUsd <= 0 || !ctx.creditDueDate) {
    return false
  }

  return ctx.creditDueDate >= period.from && ctx.creditDueDate <= period.to
}
