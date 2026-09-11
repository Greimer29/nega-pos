import type { PurchaseEstado } from '@/features/purchases/constants'
import type { MaterialUnidad } from '@/features/materials/constants'
import type { PaginationMeta } from '@/features/materials/types'
import type { AccountResumen } from '@/features/accounts/types'

export type PurchaseItemMaterial = {
  id: number
  code: string
  name: string
  category: string
  unit: MaterialUnidad
}

export type PurchaseItemProduct = {
  id: number
  name: string
  category: string
  saleUnit?: string
}

export type PurchaseItem = {
  id: number
  purchaseId: number
  materialId: number | null
  catalogProductId: number | null
  itemType: 'material' | 'product'
  quantity: string
  unitPriceUsd: string | null
  unitPriceBs: string
  subtotalUsd: string | null
  subtotalBs: string
  material?: PurchaseItemMaterial
  catalogProduct?: PurchaseItemProduct
}

export type Purchase = {
  id: number
  supplierId: number | null
  accountId: number | null
  date: string
  receivedDate: string | null
  invoiceNumber: string | null
  tieneFactura: boolean
  entryCurrencyCode: string | null
  usdRate: string | null
  totalBs: string
  totalUsd: string | null
  status: PurchaseEstado
  isCredit: boolean
  affectsInventory?: boolean
  creditDueDate: string | null
  amountPaidUsd: string
  balanceUsd: string
  notes: string | null
  voidedAt: string | null
  createdAt: string
  updatedAt: string
  items?: PurchaseItem[]
  account?: AccountResumen
}

export type PurchaseSummary = {
  totalUsd: string
  count: number
  confirmedCount: number
  confirmedPercent: number
}

export type LocalPurchaseItem = {
  localId: string
  itemType: 'material' | 'product'
  materialId?: number
  catalogProductId?: number
  material?: PurchaseItemMaterial
  catalogProduct?: PurchaseItemProduct
  quantity: number
  unitPriceUsd: number
}

export type PurchaseListResponse = {
  data: {
    purchases: Purchase[]
    meta: PaginationMeta
  }
}

export type PurchaseResponse = {
  data: {
    purchase: Purchase
  }
}

export type PurchaseSummaryResponse = {
  data: {
    summary: PurchaseSummary
  }
}

export type PurchaseDeleteResponse = {
  data: {
    id: number
    eliminado: boolean
  }
}

export type PurchaseInput = {
  supplier_id?: number
  date: string
  date_recepcion?: string
  invoice_number?: string
  usd_rate?: number
  entry_currency_code?: string
  notes?: string
  account_id?: number | null
  is_credit?: boolean
  credit_due_date?: string
}

export type PurchaseItemInput = {
  material_id?: number
  catalog_product_id?: number
  quantity: number
  unit_price_usd: number
  unit_price_bs?: number
}

export type ConfirmPurchaseInput = Partial<PurchaseInput> & {
  items?: PurchaseItemInput[]
}

export type PurchaseListParams = {
  page?: number
  perPage?: number
  supplier_id?: number
  status?: PurchaseEstado
  date_desde?: string
  date_hasta?: string
  account_id?: number
  unassigned?: boolean
}

export type Expense = {
  id: number
  date: string
  description: string
  amount: string
  currencyCode: string
  entryRate: string | null
  amountUsd: string
  accountId: number | null
  supplierId?: number | null
  machineId?: number | null
  invoiceNumber?: string | null
  createdAt: string
  updatedAt: string
  account?: AccountResumen
  machine?: {
    id: number
    name: string
  }
}

export type ExpenseSummary = {
  totalUsd: string
  count: number
  weeklySpentUsd: string
}

export type ExpenseInput = {
  date: string
  description: string
  amount: number
  currency_code?: string
  entry_rate?: number
  account_id?: number | null
  machine_id?: number | null
}

export type ExpenseListParams = {
  page?: number
  perPage?: number
  account_id?: number
  unassigned?: boolean
  machine_id?: number
}

export type Income = {
  id: number
  date: string
  description: string
  amount: string
  currencyCode: string
  entryRate: string | null
  amountUsd: string
  accountId: number | null
  createdAt: string
  updatedAt: string
  account?: AccountResumen
}

export type IncomeSummary = {
  totalUsd: string
  count: number
  weeklyReceivedUsd: string
}

export type PurchasesHubSummary = {
  purchases: PurchaseSummary
  expenses?: ExpenseSummary
  incomes?: IncomeSummary
}

export type PurchasesHubSummaryResponse = {
  data: PurchasesHubSummary
}

export type IncomeInput = {
  date: string
  description: string
  amount: number
  currency_code?: string
  entry_rate?: number
  account_id?: number | null
}

export type IncomeListParams = {
  page?: number
  perPage?: number
  account_id?: number
  unassigned?: boolean
}
