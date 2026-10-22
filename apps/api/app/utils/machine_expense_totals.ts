import type CurrencyService from '#services/currency_service'

export type MachineExpenseSumRow = {
  amount: string | number
  currency_code?: string | null
}

export function machineExpenseRowUsd(
  row: MachineExpenseSumRow,
  rates: Record<string, number>,
  currencyService: CurrencyService
): number {
  const currencyCode = (row.currency_code || 'USD').toUpperCase()
  return currencyService.toUsd(Number(row.amount ?? 0), currencyCode, rates)
}

export function sumMachineExpenseRowsUsd(
  rows: MachineExpenseSumRow[],
  rates: Record<string, number>,
  currencyService: CurrencyService
): number {
  return rows.reduce((total, row) => total + machineExpenseRowUsd(row, rates, currencyService), 0)
}
