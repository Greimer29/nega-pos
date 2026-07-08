export type CustomerTipo = 'WHITE_LABEL' | 'CORPORATE' | 'OTHER'

export type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  type: CustomerTipo
  document: string | null
  address: string | null
  notes: string | null
  creditDays: number | null
  imagePath: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerOrderResumen = {
  id: number
  code: string
  status: string
  modalidad: string
  description: string
  totalQuantity: number
  dateOrder: string
  estimatedDeliveryDate: string | null
  totalPrice: string | null
}

export type CustomerDetalle = Customer & {
  orders: CustomerOrderResumen[]
}

export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export type CustomerListResponse = {
  data: {
    customers: Customer[]
    meta: PaginationMeta
  }
}

export type CustomerResponse = {
  data: {
    customer: CustomerDetalle
  }
}

export type CustomerDeleteResponse = {
  data: {
    id: number
    eliminado: boolean
    modo: 'soft' | 'hard'
  }
}

export type CustomerInput = {
  name: string
  phone?: string
  email?: string
  type?: CustomerTipo
  document?: string
  address?: string
  notes?: string
  credit_days?: number | null
  active?: boolean
}

export type CustomerPaymentInput = {
  sale_id?: number | null
  order_id?: number | null
  account_id?: number | null
  amount_usd: number
  date: string
  note?: string
}

export type CustomerPayment = {
  id: number
  saleId: number | null
  orderId: number | null
  amountUsd: string
  date: string
  note: string | null
}

export type CustomerAccountSale = {
  id: number
  code: string | null
  status: string
  billingMode: string
  orderStatus: string
  paymentType: string
  soldAt: string | null
  confirmedAt: string | null
  totalUsd: string
  amountPaidUsd: string
  balanceUsd: string
  creditDueDate: string | null
  guestName: string | null
}

export type CustomerAccountStatement = {
  customer: Customer
  sales: CustomerAccountSale[]
  payments: CustomerPayment[]
  saldoPendienteUsd: string
}

export type CustomerAccountStatementResponse = {
  data: CustomerAccountStatement
}

export type CustomerListParams = {
  page?: number
  perPage?: number
  search?: string
  type?: CustomerTipo
  active?: boolean
}
