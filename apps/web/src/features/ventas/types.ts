import type { ProductSaleUnit } from '@/features/ventas/constants'
import type { PaginationMeta } from '@/features/orders/types'

export type { ProductSaleUnit }

export type PaymentMethodSummary = {
  code: string
  name: string
  currency_code: string
}

export type CatalogProduct = {
  id: number
  name: string
  description: string | null
  category: string
  sale_unit: ProductSaleUnit
  formula_id: number | null
  image_path: string | null
  sale_price_usd: string
  previous_sale_price_usd: string | null
  cost_usd: string
  stock_quantity: string
  stock_source?: 'manual' | 'formula'
  minimum_stock?: string
  active: boolean
  sold_qty?: number
  created_at: string
  updated_at: string
  formula?: CatalogFormulaRef | null
  movimientos?: ProductInventoryMovement[]
}

export type ProductInventoryMovement = {
  id: number
  type: 'PURCHASE_IN' | 'SALE_OUT' | 'MANUAL_ADJUSTMENT' | 'MANUAL_CARGO' | 'MANUAL_DESCARGO' | 'REVERSAL_ADJUSTMENT'
  quantity: string
  note: string | null
  purchase_item_id: number | null
  order_id: number | null
  sale_id: number | null
  created_at: string
}

export type CatalogFormulaRef = {
  id: number
  name: string
  description: string | null
  active: boolean
  materials?: CatalogFormulaItem[]
  products_count?: number
  created_at: string
  updated_at: string
}

export type CatalogFormulaItem = {
  id: number
  material_id: number
  quantity: string
  material?: {
    id: number
    code: string
    name: string
    unit: string
    last_purchase_price_usd: string | null
  }
}

export type CatalogProductInput = {
  name: string
  description?: string
  category: string
  sale_unit?: ProductSaleUnit
  sale_price_usd: number
  cost_usd?: number
  formula_id?: number | null
  stock_quantity?: number
}

export type CatalogListParams = {
  page?: number
  perPage?: number
  search?: string
  category?: string
  active?: boolean
  sortBy?: 'name' | 'most_sold'
  sortDir?: 'asc' | 'desc'
}

export type CatalogListResponse = {
  data: {
    catalog_products: CatalogProduct[]
    meta: PaginationMeta
  }
}

export type CatalogProductResponse = {
  data: {
    catalog_product: CatalogProduct
  }
}

export type CatalogFormulaResponse = {
  data: {
    formula: CatalogFormulaItem[]
  }
}

export type SaleLineFormulaMaterialInput = {
  material_id: number
  quantity_per_unit: number
}

export type SaleLineFormulaMaterial = {
  material_id: number
  quantity_per_unit: string
  material?: {
    id: number
    code: string
    name: string
    unit?: string | null
    last_purchase_price_usd?: string | null
  }
}

export type SaleLine = {
  id: number
  catalog_product_id: number | null
  material_id: number | null
  description: string
  quantity: string
  returned_quantity: string
  unit_price_usd: string
  subtotal_usd: string
  cost_usd?: string | null
  kitchen_note?: string | null
  formula_materials?: SaleLineFormulaMaterial[]
  has_custom_formula?: boolean
  effective_formula_materials?: SaleLineFormulaMaterial[]
  catalog_product?: {
    id: number
    name: string
    category?: string | null
    sale_unit?: string | null
    formula?: {
      materials?: Array<{
        quantity: string
        material?: {
          id: number
          code: string
          name: string
          unit?: string | null
        }
      }>
    } | null
  } | null
  material?: { id: number; name: string; code: string; unit?: string | null } | null
}

export type SaleBillingMode = 'FAST' | 'ORDER'
export type SaleOrderStatus = 'PENDING' | 'IN_PROCESS' | 'DELIVERED'
export type SalePaymentType = 'CASH' | 'CREDIT'
export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'RETURNED'

export type Sale = {
  id: number
  code: string | null
  customer_id: number | null
  guest_name: string | null
  payment_method_code: string | null
  payment_method: PaymentMethodSummary | null
  payment_type: SalePaymentType
  billing_mode: SaleBillingMode
  order_status: SaleOrderStatus
  amount_paid_usd: string
  balance_usd: string
  credit_due_date: string | null
  total_usd: string
  total_bs: string | null
  usd_rate: string | null
  status: SaleStatus
  sold_at: string | null
  confirmed_at: string | null
  returned_at: string | null
  customer?: {
    id: number
    name: string
    type: string
    active: boolean
    credit_days?: number | null
    document?: string | null
  } | null
  sold_by?: { id: number; name: string } | null
  lines?: SaleLine[]
  created_at: string
  updated_at: string
}

export type CreateSaleInput = {
  customer_id?: number
  guest_name?: string
  payment_method_code?: string
  payment_type?: SalePaymentType
  billing_mode?: SaleBillingMode
  usd_rate?: number
  confirm?: boolean
  sold_by_user_id?: number
  lines: {
    catalog_product_id?: number
    material_id?: number
    quantity: number
    unit_price_usd: number
    kitchen_note?: string | null
    formula_materials?: SaleLineFormulaMaterialInput[]
  }[]
}

export type UpdateSaleInput = {
  customer_id?: number | null
  guest_name?: string | null
  payment_method_code?: string
  payment_type?: SalePaymentType
  billing_mode?: SaleBillingMode
  usd_rate?: number | null
  lines?: CreateSaleInput['lines']
}

export type ConfirmSaleInput = {
  payment_method_code?: string
  payment_type?: SalePaymentType
  billing_mode?: SaleBillingMode
}

export type SaleReturnInput = {
  lines?: { line_id: number; quantity: number }[]
}

export type SaleListParams = {
  page?: number
  perPage?: number
  customer_id?: number
  status?: SaleStatus
  exclude_status?: SaleStatus
  search?: string
  date_from?: string
  date_to?: string
}

export type SaleListResponse = {
  data: {
    sales: Sale[]
    meta: PaginationMeta
  }
}

export type SaleResponse = {
  data: {
    sale: Sale
  }
}

export type CartItem = {
  key: string
  type: 'catalog' | 'material'
  id: number
  name: string
  quantity: number
  unit_price_usd: number
}

export type OrderLine = {
  id: number
  order_id: number
  catalog_product_id: number
  quantity: string
  unit_price_usd: string
  subtotal_usd: string
  catalog_product?: CatalogProduct
}

export type OrderBudget = {
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
