import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import CatalogProduct from '#models/catalog_product'
import Material from '#models/material'
import ProductInventoryMovement from '#models/product_inventory_movement'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export type InventorySortBy = 'id' | 'name' | 'sale_price' | 'quantity'
export type InventorySortDir = 'asc' | 'desc'

export type InventoryReportFilters = {
  search?: string
  category?: string
  sort_by?: InventorySortBy
  sort_dir?: InventorySortDir
  active?: boolean
  low_stock?: boolean
  hide_zero?: boolean
  page?: number
  per_page?: number
  export?: boolean
}

export type InventoryReportProduct = {
  kind: 'product' | 'material'
  product_id: number
  code: string
  image_path: string | null
  description: string
  sale_price_usd: string
  cost_usd: string | null
  sale_unit: string
  category: string
  stock_source: 'manual' | 'formula'
  low_stock: boolean
  has_sizes: boolean
  total_quantity: string
  lines: Array<{ size: string | null; quantity: string }>
}

export type InventoryMovementTypeFilter =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'MANUAL_ADJUSTMENT'
  | 'MANUAL_CARGO'
  | 'MANUAL_DESCARGO'
  | 'REVERSAL_ADJUSTMENT'

export type InventoryMovementsFilters = {
  from?: string
  to?: string
  month?: string
  page?: number
  per_page?: number
  export?: boolean
  types?: InventoryMovementTypeFilter[]
}

function padProductCode(id: number) {
  return String(id).padStart(7, '0')
}

function qtyString(value: number) {
  return value.toFixed(3)
}

function resolvePeriod(filters: InventoryMovementsFilters) {
  if (filters.month) {
    const start = DateTime.fromISO(`${filters.month}-01`, { zone: 'utc' }).startOf('day')
    const end = start.endOf('month')
    return { from: start, to: end }
  }

  const from = filters.from
    ? DateTime.fromISO(filters.from, { zone: 'utc' }).startOf('day')
    : DateTime.now().toUTC().startOf('month')
  const to = filters.to
    ? DateTime.fromISO(filters.to, { zone: 'utc' }).endOf('day')
    : DateTime.now().toUTC().endOf('day')

  return { from, to }
}

export default class InventoryReportService {
  private stockService = new CatalogProductStockService()

  async snapshot(filters: InventoryReportFilters = {}) {
    const page = filters.page ?? 1
    const perPage = filters.per_page ?? 30
    const sortBy = filters.sort_by ?? 'name'
    const sortDir = filters.sort_dir ?? 'asc'
    const activeOnly = filters.active !== false

    const [products, materials] = await Promise.all([
      this.loadProducts(filters, activeOnly),
      this.loadMaterials(filters, activeOnly),
    ])

    let items = [...products, ...materials]

    if (filters.low_stock) {
      items = items.filter((item) => item.low_stock)
    }

    if (filters.hide_zero) {
      items = items.filter((item) => Number(item.total_quantity) > 0)
    }

    items = this.sortItems(items, sortBy, sortDir)

    const total = items.length
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const currentPage = filters.export ? 1 : Math.min(page, lastPage)
    const pageItems = filters.export
      ? items
      : items.slice((currentPage - 1) * perPage, currentPage * perPage)

    return {
      products: pageItems,
      meta: {
        total,
        perPage: filters.export ? total || perPage : perPage,
        currentPage,
        lastPage: filters.export ? 1 : lastPage,
        firstPage: 1,
      },
    }
  }

  async productMovements(productId: number, filters: InventoryMovementsFilters = {}) {
    const product = await CatalogProduct.find(productId)
    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    const stock = await this.stockService.calcularStockDisponible(product)
    const { from, to } = resolvePeriod(filters)
    const page = filters.page ?? 1
    const perPage = filters.per_page ?? 30

    const query = ProductInventoryMovement.query()
      .where('catalog_product_id', productId)
      .where('created_at', '>=', from.toSQL()!)
      .where('created_at', '<=', to.toSQL()!)
      .preload('sale')
      .preload('order')
      .preload('purchaseItem', (builder) => builder.preload('purchase'))
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')

    if (filters.types?.length) {
      query.whereIn('type', filters.types)
    }

    const all = await query
    const total = all.length
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const currentPage = filters.export ? 1 : Math.min(page, lastPage)
    const pageRows = filters.export
      ? all
      : all.slice((currentPage - 1) * perPage, currentPage * perPage)

    return {
      product: {
        kind: 'product' as const,
        product_id: Number(product.id),
        code: padProductCode(Number(product.id)),
        image_path: product.imagePath,
        description: product.name,
        sale_price_usd: product.salePriceUsd,
        cost_usd: product.costUsd,
        sale_unit: product.saleUnit,
        category: product.category,
        stock_source: stock.source,
        low_stock: stock.quantity < Number(product.minimumStock),
        has_sizes: false,
        total_quantity: qtyString(stock.quantity),
        lines: [{ size: null, quantity: qtyString(stock.quantity) }],
      },
      movements: pageRows.map((row) => ({
        id: Number(row.id),
        type: row.type,
        quantity: row.quantity,
        note: row.note,
        created_at: row.createdAt.toISO(),
        sale_id: row.saleId ? Number(row.saleId) : null,
        sale_code: row.sale?.code ?? null,
        order_id: row.orderId ? Number(row.orderId) : null,
        order_code: row.order?.code ?? null,
        purchase_id: row.purchaseItem?.purchaseId ? Number(row.purchaseItem.purchaseId) : null,
        purchase_item_id: row.purchaseItemId ? Number(row.purchaseItemId) : null,
      })),
      meta: {
        total,
        perPage: filters.export ? total || perPage : perPage,
        currentPage,
        lastPage: filters.export ? 1 : lastPage,
        firstPage: 1,
      },
      period: {
        from: from.toISODate(),
        to: to.toISODate(),
      },
    }
  }

  private async loadProducts(
    filters: InventoryReportFilters,
    activeOnly: boolean
  ): Promise<InventoryReportProduct[]> {
    const query = CatalogProduct.query()

    if (activeOnly) {
      query.where('active', true)
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('name', term)
          .orWhereILike('description', term)
          .orWhereILike('category', term)
          .orWhereRaw('CAST(id AS CHAR) LIKE ?', [term])
      })
    }

    const products = await query
    if (products.length === 0) {
      return []
    }

    const stockMap = await this.stockService.calcularStockForProducts(products)

    return products.map((product) => {
      const stock = stockMap.get(Number(product.id)) ?? {
        quantity: Number(product.stockQuantity),
        source: product.formulaId ? ('formula' as const) : ('manual' as const),
      }
      const quantity = stock.quantity
      const lowStock = quantity < Number(product.minimumStock)

      return {
        kind: 'product' as const,
        product_id: Number(product.id),
        code: padProductCode(Number(product.id)),
        image_path: product.imagePath,
        description: product.name,
        sale_price_usd: product.salePriceUsd,
        cost_usd: product.costUsd,
        sale_unit: product.saleUnit,
        category: product.category,
        stock_source: stock.source,
        low_stock: lowStock,
        has_sizes: false,
        total_quantity: qtyString(quantity),
        lines: [{ size: null, quantity: qtyString(quantity) }],
      }
    })
  }

  private async loadMaterials(
    filters: InventoryReportFilters,
    activeOnly: boolean
  ): Promise<InventoryReportProduct[]> {
    const query = Material.query()

    if (activeOnly) {
      query.where('active', true)
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('name', term)
          .orWhereILike('code', term)
          .orWhereILike('description', term)
          .orWhereILike('category', term)
      })
    }

    const materials = await query
    if (materials.length === 0) {
      return []
    }

    const ids = materials.map((m) => Number(m.id))
    const stockRows = await db
      .from('inventory_movements')
      .select('material_id')
      .sum('quantity as total')
      .whereIn('material_id', ids)
      .groupBy('material_id')

    const stockById = new Map<number, number>()
    for (const row of stockRows) {
      stockById.set(Number(row.material_id), Number(row.total ?? 0))
    }

    return materials.map((material) => {
      const quantity = stockById.get(Number(material.id)) ?? 0
      const lowStock = quantity < Number(material.minimumStock)
      const price = material.salePriceUsd ?? '0.0000'
      const cost = material.lastPurchasePriceUsd

      return {
        kind: 'material' as const,
        product_id: Number(material.id),
        code: material.code,
        image_path: material.imagePath,
        description: material.name,
        sale_price_usd: price,
        cost_usd: cost,
        sale_unit: material.unit,
        category: material.category,
        stock_source: 'manual' as const,
        low_stock: lowStock,
        has_sizes: false,
        total_quantity: qtyString(quantity),
        lines: [{ size: null, quantity: qtyString(quantity) }],
      }
    })
  }

  private sortItems(
    items: InventoryReportProduct[],
    sortBy: InventorySortBy,
    sortDir: InventorySortDir
  ) {
    const dir = sortDir === 'desc' ? -1 : 1

    return [...items].sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'id':
          cmp = a.code.localeCompare(b.code, 'es', { numeric: true })
          break
        case 'sale_price':
          cmp = Number(a.sale_price_usd) - Number(b.sale_price_usd)
          break
        case 'quantity':
          cmp = Number(a.total_quantity) - Number(b.total_quantity)
          break
        case 'name':
        default:
          cmp = a.description.localeCompare(b.description, 'es', { sensitivity: 'base' })
          break
      }

      if (cmp === 0) {
        cmp = a.product_id - b.product_id
      }
      return cmp * dir
    })
  }
}
