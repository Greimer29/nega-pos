import type { MaterialCategoria, MaterialSortBy, MaterialStatusFilter, MaterialUnidad } from '@/features/materials/constants'

export type { MaterialCategoria, MaterialSortBy, MaterialStatusFilter, MaterialUnidad }

export type InventoryMovement = {
  id: number
  type: string
  quantity: string
  note: string | null
  createdAt: string
}

export type Material = {
  id: number
  code: string
  name: string
  description: string | null
  category: MaterialCategoria
  unit: MaterialUnidad
  minimumStock: string
  stockActual?: number
  stockComprometido?: number
  location: string | null
  defaultSupplierId: number | null
  lastPurchasePrice: string | null
  lastPurchasePriceUsd: string | null
  previousPurchasePriceUsd?: string | null
  salePriceUsd?: string | null
  previousSalePriceUsd?: string | null
  lastPurchaseDate: string | null
  imagePath: string | null
  active: boolean
  purchasedQty?: number
  usedQty?: number
  flowQty?: number
  rating?: number
  createdAt: string
  updatedAt: string
  movimientos?: InventoryMovement[]
}

export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export type MaterialListResponse = {
  data: {
    materials: Material[]
    meta: PaginationMeta
  }
}

export type MaterialResponse = {
  data: {
    material: Material
  }
}

export type MaterialDeleteResponse = {
  data: {
    id: number
    eliminado: boolean
    modo: 'soft' | 'hard'
  }
}

export type AjusteStockResponse = {
  data: {
    movimiento: InventoryMovement
    stockActual: number
  }
}

export type MaterialInput = {
  code: string
  name: string
  description?: string
  category: MaterialCategoria
  unit: MaterialUnidad
  stock_minimo?: number
  location?: string
  supplier_habitual_id?: number
  last_purchase_price_usd?: number
  active?: boolean
}

export type MaterialListParams = {
  page?: number
  perPage?: number
  search?: string
  category?: MaterialCategoria
  status?: MaterialStatusFilter | ''
  sortBy?: MaterialSortBy
  sortDir?: 'asc' | 'desc'
  lowStock?: boolean
}

export type AjusteStockInput = {
  mode: 'CARGO' | 'DESCARGO' | 'AJUSTE'
  quantity: number
  note?: string
}

export type HistorialPrecioItem = {
  purchaseItemId: number
  purchaseId: number
  date: string
  invoiceNumber: string | null
  supplier: {
    id: number
    name: string
  }
  quantity: string
  unitPriceBs: string
  unitPriceUsd: string | null
  subtotalBs: string
  subtotalUsd: string | null
}

export type HistorialPreciosResponse = {
  data: {
    historial: HistorialPrecioItem[]
  }
}
