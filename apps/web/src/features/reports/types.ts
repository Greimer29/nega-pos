export type AccountStatementMovementType = 'sale' | 'customer_payment' | 'purchase' | 'supplier_payment' | 'expense' | 'machine_expense'



export type AccountStatementMovement = {

  id: number

  type: AccountStatementMovementType

  date: string

  label: string

  account: { id: number; name: string } | null

  amountNative: string

  currencyCode: string

  amountDisplay: string

  amountUsd: string

  isIncome: boolean

  referenceId: number

  status?: string

  isCreditPurchase?: boolean

  isCreditPurchaseCarryover?: boolean

  creditDueDate?: string | null

  purchaseDate?: string

  creditOverdue?: boolean

  creditReportStatus?: 'pending' | 'overdue' | 'settled'

  isCreditSale?: boolean

  creditBalanceUsd?: string

  saleDate?: string

  customerId?: number

  supplierId?: number

}



export type AccountStatementSummary = {

  displayCurrency: string

  salesUsd: string

  purchasesUsd: string

  expensesUsd: string

  machineExpensesUsd: string

  netUsd: string

  sales: string

  purchases: string

  expenses: string

  machineExpenses: string

  net: string

  rates: Record<string, string>

}



export type AccountStatementParams = {

  from?: string

  to?: string

  month?: string

  account_id?: number

  unassigned?: boolean

  display_currency?: string

  types?: Array<'purchases' | 'expenses' | 'machine_expenses' | 'sales'>

}



export type AccountStatementResponse = {

  data: {

    period: { from: string; to: string }

    summary: AccountStatementSummary

    movements: AccountStatementMovement[]

  }

}

