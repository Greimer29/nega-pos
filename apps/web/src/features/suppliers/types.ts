export type Supplier = {
  id: number
  name: string
  rif: string | null
  phone: string | null
  email: string | null
  notes: string | null
  creditDays: number | null
  imagePath: string | null
  active: boolean
  /** Presente en listado: deuda a crédito confirmada. */
  saldoPendienteUsd?: string
  /** Presente en listado: hay al menos una compra vencida con saldo. */
  tieneSaldoVencido?: boolean
  createdAt: string
  updatedAt: string
}

export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export type SupplierListResponse = {
  data: {
    suppliers: Supplier[]
    meta: PaginationMeta
  }
}

export type SupplierResponse = {
  data: {
    supplier: Supplier
  }
}

export type SupplierDeleteResponse = {
  data: {
    id: number
    eliminado: boolean
    modo: 'soft' | 'hard'
  }
}

export type SupplierInput = {
  name: string
  rif?: string
  phone?: string
  email?: string
  notes?: string
  credit_days?: number | null
  active?: boolean
}

export type SupplierListParams = {
  page?: number
  perPage?: number
  search?: string
  active?: boolean
}

export type SupplierPayment = {
  id: number
  purchaseId: number | null
  amountUsd: string
  date: string
  note: string | null
}

export type SupplierAccountStatement = {
  supplier: Supplier
  purchases: {
    id: number
    date: string
    invoiceNumber: string | null
    totalUsd: string | null
    amountPaidUsd: string
    balanceUsd: string
    creditDueDate: string | null
    status: string
    isCredit: boolean
    affectsInventory: boolean
  }[]
  payments: SupplierPayment[]
  expenses: {
    id: number
    date: string
    description: string
    amountUsd: string
    invoiceNumber: string | null
    accountId: number | null
    account?: { id: number; name: string } | null
  }[]
  saldoPendienteUsd: string
}

export type SupplierPaymentInput = {
  purchase_id?: number | null
  account_id?: number | null
  amount_usd: number
  date: string
  note?: string
}

export type SupplierInvoiceInput = {
  date: string
  amount: number
  currency_code?: string
  entry_rate?: number
  invoice_number?: string
  note?: string
  is_credit: boolean
  account_id?: number | null
  credit_due_date?: string | null
}
