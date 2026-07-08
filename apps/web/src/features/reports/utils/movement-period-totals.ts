import type { ReportMovementCategorySlug } from '@/features/reports/report-categories'
import type { AccountStatementMovement } from '@/features/reports/types'

export type CreditSplitPeriodTotals = {
  kind: 'credit_split'
  cashUsd: number
  pendingCreditUsd: number
}

export type SinglePeriodTotals = {
  kind: 'single'
  totalUsd: number
}

export type MovementPeriodTotals = CreditSplitPeriodTotals | SinglePeriodTotals

function isPendingCredit(status: AccountStatementMovement['creditReportStatus']) {
  return status !== 'settled'
}

function pendingCreditAmount(movement: AccountStatementMovement) {
  if (movement.isCreditSale || movement.isCreditPurchase) {
    return Number(movement.amountUsd)
  }

  const pendingBalance = Number(movement.creditBalanceUsd ?? movement.amountUsd)
  if (pendingBalance <= 0 || !isPendingCredit(movement.creditReportStatus)) {
    return 0
  }
  return pendingBalance
}

function computeSalesTotals(movements: AccountStatementMovement[]): CreditSplitPeriodTotals {
  let cashUsd = 0
  let pendingCreditUsd = 0

  for (const movement of movements) {
    if (movement.type === 'customer_payment') {
      cashUsd += Number(movement.amountUsd)
      continue
    }

    if (movement.type !== 'sale') {
      continue
    }

    if (movement.isCreditSale) {
      pendingCreditUsd += pendingCreditAmount(movement)
      continue
    }

    cashUsd += Number(movement.amountUsd)
  }

  return { kind: 'credit_split', cashUsd, pendingCreditUsd }
}

function computePurchaseTotals(movements: AccountStatementMovement[]): CreditSplitPeriodTotals {
  let cashUsd = 0
  let pendingCreditUsd = 0

  for (const movement of movements) {
    if (movement.type === 'supplier_payment') {
      cashUsd += Number(movement.amountUsd)
      continue
    }

    if (movement.type !== 'purchase') {
      continue
    }

    if (movement.isCreditPurchase) {
      if (movement.isCreditPurchaseCarryover) {
        continue
      }

      pendingCreditUsd += pendingCreditAmount(movement)
      continue
    }

    cashUsd += Number(movement.amountUsd)
  }

  return { kind: 'credit_split', cashUsd, pendingCreditUsd }
}

function computeExpenseTotals(
  movements: AccountStatementMovement[],
  type: 'expense' | 'machine_expense'
): SinglePeriodTotals {
  let totalUsd = 0

  for (const movement of movements) {
    if (movement.type === type) {
      totalUsd += Number(movement.amountUsd)
    }
  }

  return { kind: 'single', totalUsd }
}

export function computeMovementPeriodTotals(
  movements: AccountStatementMovement[],
  categorySlug: ReportMovementCategorySlug
): MovementPeriodTotals | null {
  switch (categorySlug) {
    case 'ventas':
      return computeSalesTotals(movements)
    case 'compras':
      return computePurchaseTotals(movements)
    case 'gastos':
      return computeExpenseTotals(movements, 'expense')
    case 'maquina':
      return computeExpenseTotals(movements, 'machine_expense')
    default:
      return null
  }
}

/** @deprecated use computeMovementPeriodTotals */
export function computeSalesPeriodTotals(movements: AccountStatementMovement[]) {
  const totals = computeSalesTotals(movements)
  return { cashUsd: totals.cashUsd, pendingCreditUsd: totals.pendingCreditUsd }
}
