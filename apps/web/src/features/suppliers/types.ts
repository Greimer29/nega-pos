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
  }[]
  payments: SupplierPayment[]
  saldoPendienteUsd: string
}

export type SupplierPaymentInput = {
  purchase_id?: number | null
  account_id?: number | null
  amount_usd: number
  date: string
  note?: string
}
