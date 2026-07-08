import type { PaginationMeta } from '@/features/orders/types'

export type FormulaMaterialItem = {
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

export type Formula = {
  id: number
  name: string
  description: string | null
  active: boolean
  products_count?: number
  materials?: FormulaMaterialItem[]
  created_at: string
  updated_at: string
}

export type FormulaInput = {
  name: string
  description?: string
  active?: boolean
}

export type FormulaListParams = {
  page?: number
  perPage?: number
  search?: string
  active?: boolean
}

export type FormulaListResponse = {
  data: {
    formulas: Formula[]
    meta: PaginationMeta
  }
}

export type FormulaResponse = {
  data: {
    formula: Formula
  }
}

export type FormulaMaterialsResponse = {
  data: {
    materials: FormulaMaterialItem[]
  }
}
