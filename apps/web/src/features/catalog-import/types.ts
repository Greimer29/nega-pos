export type CatalogImportKind = 'PRODUCT' | 'SERVICE' | 'MATERIAL'

export type CatalogImportColumn = {
  key: string
  header: string
  required: boolean
  hint: string
}

export type CatalogImportRowResult = {
  row: number
  ok: boolean
  id?: number
  error?: string
}

export type CatalogImportResult = {
  created: number
  failed: number
  results: CatalogImportRowResult[]
}

export type CatalogProductImportRow = {
  row: number
  name?: string
  category?: string
  description?: string
  sale_unit?: string
  sale_price_usd?: number
  cost_usd?: number
  stock_quantity?: number
  minimum_stock?: number
}

export type MaterialImportRow = {
  row: number
  code?: string
  name?: string
  category?: string
  unit?: string
  description?: string
  stock_quantity?: number
  minimum_stock?: number
  location?: string
  last_purchase_price_usd?: number
}

export const MAX_IMPORT_ROWS = 200
