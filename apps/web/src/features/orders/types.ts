import type { Customer } from '@/features/customers/types'

export type OrderEstado =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'

export type OrderModalidad = 'WHITE_LABEL' | 'CORPORATE'
export type OrderPaymentType = 'CASH' | 'CREDIT'

export type OrderMaterial = {
  id: number
  orderId: number
  materialId: number
  quantityPerGarment: string
  consumoProyectado: string
  notes: string | null
  material?: {
    id: number
    code: string
    name: string
    unit: string
  }
}

export type RecipeStockInsuficiente = {
  material_id: number
  name: string
  stock_actual: number
  consumo_proyectado: number
  faltante: number
}

export type Order = {
  id: number
  code: string
  customerId: number | null
  guestName: string | null
  modalidad: OrderModalidad
  description: string
  totalQuantity: number
  dateOrder: string
  estimatedDeliveryDate: string | null
  status: OrderEstado
  totalPrice: string | null
  paymentType: OrderPaymentType | null
  creditDueDate: string | null
  amountPaidUsd: string | null
  balanceUsd: string | null
  confirmedAt: string | null
  notes: string | null
  returnedAt: string | null
  tieneReferencia: boolean
  createdAt: string
  updatedAt: string
  customer?: Pick<Customer, 'id' | 'name' | 'type' | 'active' | 'creditDays'>
  materials?: OrderMaterial[]
  lines?: OrderLine[]
  warnings?: { code: string; message: string }[]
}

export type OrderLine = {
  id: number
  order_id: number
  catalog_product_id: number
  quantity: string
  unit_price_usd: string
  subtotal_usd: string
  returned_quantity?: string
  catalog_product?: {
    id: number
    name: string
    sale_price_usd: string
    category: string
  }
}

export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export type OrderListResponse = {
  data: {
    orders: Order[]
    meta: PaginationMeta
  }
}

export type OrderResponse = {
  data: {
    order: Order
  }
}

export type OrderDeleteResponse = {
  data: {
    id: number
    eliminado: boolean
  }
}

export type OrderInput = {
  customer_id?: number
  guest_name?: string
  modalidad: OrderModalidad
  description: string
  quantity_total: number
  date_order: string
  date_entrega_estimada?: string
  total_price?: number
  notes?: string
  payment_type?: OrderPaymentType
  lines?: OrderLineInput[]
}

export type OrderListParams = {
  page?: number
  perPage?: number
  customer_id?: number
  status?: OrderEstado
  exclude_status?: OrderEstado
  modalidad?: OrderModalidad
  date_desde?: string
  date_hasta?: string
  search?: string
  sort_by?: 'order_date' | 'code' | 'created_at' | 'confirmed_at'
  direction?: 'asc' | 'desc'
}

export type OrderTransicionInput = {
  new_status: OrderEstado
  force?: boolean
  payment_type?: OrderPaymentType
}

export type OrderReturnLineInput = {
  line_id: number
  quantity: number
}

export type OrderReturnInput = {
  lines?: OrderReturnLineInput[]
}

export type OrderMaterialInput = {
  material_id: number
  quantity_per_garment: number
  notes?: string
}

export type OrderMaterialUpdateInput = {
  material_id?: number
  quantity_per_garment?: number
  notes?: string
}

export type OrderMaterialResponse = {
  data: {
    orderMaterial: OrderMaterial
  }
}

export type OrderLineInput = {
  catalog_product_id: number
  quantity: number
}

export type OrderLineResponse = {
  data: {
    order_line: OrderLine
  }
}

export type OrderBudgetResponse = {
  data: {
    budget: {
      lines: {
        id: number
        catalog_product_id: number
        product_name: string
        quantity: string
        unit_price_usd: string
        subtotal_usd: string
      }[]
      total_usd: string
    }
  }
}
