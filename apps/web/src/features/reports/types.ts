export type AccountStatementMovementType =
  | 'sale'
  | 'customer_payment'
  | 'purchase'
  | 'supplier_payment'
  | 'expense'
  | 'machine_expense'
  | 'income'

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
  incomesUsd: string
  pendingPayablesUsd: string
  overduePayablesUsd: string
  pendingReceivablesUsd: string
  overdueReceivablesUsd: string
  netUsd: string
  sales: string
  purchases: string
  expenses: string
  machineExpenses: string
  incomes: string
  pendingPayables: string
  overduePayables: string
  pendingReceivables: string
  overdueReceivables: string
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
  types?: Array<'purchases' | 'expenses' | 'machine_expenses' | 'sales' | 'incomes'>
}

export type AccountStatementResponse = {
  data: {
    period: { from: string; to: string }
    summary: AccountStatementSummary
    movements: AccountStatementMovement[]
  }
}

export type IncomeStatementParams = {
  from?: string
  to?: string
  month?: string
  display_currency?: string
}

export type IncomeStatementSummary = {
  displayCurrency: string
  salesRevenueUsd: string
  cogsUsd: string
  grossProfitUsd: string
  operatingExpensesUsd: string
  operatingIncomeUsd: string
  grossMarginPct: number | null
  operatingMarginPct: number | null
  salesRevenue: string
  cogs: string
  grossProfit: string
  operatingExpenses: string
  operatingIncome: string
  rates: Record<string, string>
}

export type IncomeStatementResponse = {
  data: {
    period: { from: string; to: string }
    summary: IncomeStatementSummary
  }
}

export type BalancePositionParams = {
  display_currency?: string
}

export type BalancePositionSummary = {
  displayCurrency: string
  inventoryUsd: string
  receivablesUsd: string
  machinesUsd: string
  totalAssetsUsd: string
  payablesUsd: string
  totalLiabilitiesUsd: string
  estimatedEquityUsd: string
  capitalContributionsUsd: string
  inventory: string
  receivables: string
  machines: string
  totalAssets: string
  payables: string
  totalLiabilities: string
  estimatedEquity: string
  capitalContributions: string
  rates: Record<string, string>
}

export type BalancePositionResponse = {
  data: {
    asOf: string
    summary: BalancePositionSummary
  }
}

export type FinancialSummaryParams = {
  from?: string
  to?: string
  month?: string
  display_currency?: string
}

export type FinancialSummaryDiagnosisTone = 'positive' | 'caution' | 'negative'

export type FinancialSummaryDiagnosis = {
  tone: FinancialSummaryDiagnosisTone
  headline: string
  detail: string
}

export type FinancialSummaryData = {
  period: { from: string; to: string }
  asOf: string
  diagnosis: FinancialSummaryDiagnosis
  displayCurrency: string
  rates: Record<string, string>
  resultado: {
    salesRevenueUsd: string
    cogsUsd: string
    grossProfitUsd: string
    operatingExpensesUsd: string
    operatingIncomeUsd: string
    grossMarginPct: number | null
    operatingMarginPct: number | null
    salesRevenue: string
    cogs: string
    grossProfit: string
    operatingExpenses: string
    operatingIncome: string
  }
  flujo: {
    netUsd: string
    salesUsd: string
    incomesUsd: string
    purchasesUsd: string
    expensesUsd: string
    net: string
    sales: string
    incomes: string
    purchases: string
    expenses: string
  }
  patrimonio: {
    inventoryUsd: string
    receivablesUsd: string
    machinesUsd: string
    totalAssetsUsd: string
    payablesUsd: string
    totalLiabilitiesUsd: string
    estimatedEquityUsd: string
    capitalContributionsUsd: string
    inventory: string
    receivables: string
    machines: string
    totalAssets: string
    payables: string
    totalLiabilities: string
    estimatedEquity: string
    capitalContributions: string
  }
}

export type FinancialSummaryResponse = {
  data: FinancialSummaryData
}

export type InventoryReportSortBy = 'id' | 'name' | 'sale_price' | 'quantity'
export type InventoryReportSortDir = 'asc' | 'desc'

export type InventoryReportProduct = {
  kind?: 'product' | 'material'
  product_id: number
  code: string
  image_path: string | null
  description: string
  sale_price_usd: string
  cost_usd: string | null
  sale_unit: string
  category: string
  stock_source: 'manual' | 'formula'
  low_stock: boolean
  has_sizes: boolean
  total_quantity: string
  lines: Array<{ size: string | null; quantity: string }>
}

export type InventoryReportParams = {
  search?: string
  category?: string
  sort_by?: InventoryReportSortBy
  sort_dir?: InventoryReportSortDir
  active?: boolean
  low_stock?: boolean
  hide_zero?: boolean
  page?: number
  per_page?: number
  export?: boolean
}

export type InventoryReportMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export type InventoryReportResponse = {
  data: {
    products: InventoryReportProduct[]
    meta: InventoryReportMeta
  }
}

export type InventoryMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'MANUAL_ADJUSTMENT'
  | 'MANUAL_CARGO'
  | 'MANUAL_DESCARGO'
  | 'REVERSAL_ADJUSTMENT'
  | 'PRICE_CHANGE'

export type InventoryProductMovement = {
  id: number
  type: InventoryMovementType
  quantity: string
  note: string | null
  created_at: string | null
  created_by_user_id?: number | null
  created_by_name?: string | null
  sale_id: number | null
  sale_code: string | null
  order_id: number | null
  order_code: string | null
  purchase_id: number | null
  purchase_item_id: number | null
}

export type InventoryMovementsParams = {
  from?: string
  to?: string
  month?: string
  page?: number
  per_page?: number
  export?: boolean
  types?: InventoryMovementType[]
}

export type InventoryMovementsResponse = {
  data: {
    product: InventoryReportProduct
    movements: InventoryProductMovement[]
    meta: InventoryReportMeta
    period: { from: string | null; to: string | null }
  }
}
