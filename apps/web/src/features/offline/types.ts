export type OfflineCatalogSnapshot = {
  generated_at: string
  products: Array<{
    id: number
    name: string
    barcode: string | null
    category: string
    item_kind: string
    sale_unit: string
    sale_price_usd: string
    cost_usd: string
    active: boolean
    formula_id: number | null
    stock_quantity: number
    wholesale_enabled: boolean
    wholesale_sale_price_usd: string | null
    wholesale_cost_usd: string | null
    wholesale_units_per_pack: number | null
    sizes: Array<{ id: number; size: string; stock_quantity: string }>
    formula_materials: Array<{
      material_id: number
      quantity_per_unit: number
      material_name: string | null
    }>
  }>
  materials: Array<{
    id: number
    name: string
    unit: string
    barcode: string | null
    sale_price_usd: string | null
    last_purchase_price_usd: string | null
    stock_quantity: number
    active: boolean
  }>
  customers: Array<{
    id: number
    name: string
    credit_days: number
    document: string | null
    phone: string | null
  }>
  payment_methods: Array<{
    code: string
    name: string
    currency_code: string
    active: boolean
  }>
  currencies: Array<{
    code: string
    name: string
    rate_per_usd: string
    is_base: boolean
    active: boolean
  }>
}

export type OfflineSaleLinePayload = {
  catalog_product_id?: number
  material_id?: number
  quantity: number
  unit_price_usd: number
  description?: string | null
  kitchen_note?: string | null
  catalog_product_size_id?: number | null
  size?: string | null
  is_wholesale?: boolean
  formula_materials?: Array<{ material_id: number; quantity_per_unit: number }>
}

export type OfflineSalePaymentPayload = {
  payment_method_code: string
  amount_usd: number
  currency_code?: string
  usd_rate?: number
}

export type OfflineSaleOperation = {
  type: 'sale'
  offline_client_id: string
  sold_at: string
  sales_shift_id: number | null
  customer_id: number | null
  guest_name: string | null
  payment_type: 'CASH' | 'CREDIT'
  billing_mode: 'FAST' | 'ORDER'
  discount_usd: number
  notes?: string | null
  payment_method_code?: string | null
  currency_code?: string | null
  usd_rate?: number | null
  payments?: OfflineSalePaymentPayload[]
  lines: OfflineSaleLinePayload[]
  local_ref: string
}

export type OfflineReturnOperation = {
  type: 'return'
  offline_client_id: string
  sale_id: number
  lines?: Array<{ line_id: number; quantity: number }>
}

export type OfflineTransitionOperation = {
  type: 'transition'
  offline_client_id: string
  sale_id: number
  order_status: 'IN_PROCESS' | 'DELIVERED'
}

export type OfflineCloseShiftOperation = {
  type: 'close_shift'
  offline_client_id: string
  sales_shift_id: number
}

export type OfflineOperation =
  | OfflineSaleOperation
  | OfflineReturnOperation
  | OfflineTransitionOperation
  | OfflineCloseShiftOperation
