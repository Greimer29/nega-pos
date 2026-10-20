import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import type { CatalogItemKind } from '#constants/catalog_item_kind'
import CatalogProduct from '#models/catalog_product'
import PurchaseItem from '#models/purchase_item'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'

export type ListCatalogProductsFilters = {
  page?: number
  perPage?: number
  search?: string
  barcode?: string
  category?: string
  size?: string
  active?: boolean
  /** Default PRODUCT so existing product UIs never list services accidentally. */
  itemKind?: CatalogItemKind
  sortBy?: 'name' | 'most_sold'
  sortDir?: 'asc' | 'desc'
}

export type CatalogProductPurchaseHistoryFilters = {
  month?: string
  from?: string
  to?: string
}

export type CatalogProductPurchaseHistoryItem = {
  purchaseItemId: number
  purchaseId: number
  date: string
  supplier: {
    id: number
    code: string | null
    name: string
  }
  quantity: string
  unitPriceUsd: string | null
  subtotalUsd: string | null
}

const MOST_SOLD_SQL = `COALESCE((
  SELECT SUM(sl.quantity)
  FROM sale_lines sl
  WHERE sl.catalog_product_id = catalog_products.id
), 0) + COALESCE((
  SELECT SUM(ol.quantity)
  FROM order_lines ol
  INNER JOIN orders o ON o.id = ol.order_id
  WHERE ol.catalog_product_id = catalog_products.id
    AND o.status NOT IN ('CANCELLED', 'DRAFT')
), 0)`

export default class CatalogProductQueryService {
  async listar(
    filters: ListCatalogProductsFilters = {}
  ): Promise<ModelPaginatorContract<CatalogProduct>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 30
    const sortBy = filters.sortBy ?? 'name'
    const sortDir = filters.sortDir ?? 'asc'

    const query = CatalogProduct.query().preload('sizes', (q) => q.orderBy('size', 'asc'))

    const barcode = filters.barcode?.trim()
    if (barcode) {
      query.where('barcode', barcode)
    } else if (filters.search) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('name', term)
          .orWhereILike('description', term)
          .orWhereILike('supplier_code', term)
      })
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.size?.trim()) {
      const sizeTerm = filters.size.trim()
      query.whereHas('sizes', (sizesQuery) => {
        sizesQuery.whereILike('size', sizeTerm).where('stock_quantity', '>', 0)
      })
    }

    if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    const itemKind = filters.itemKind ?? 'PRODUCT'
    query.where('itemKind', itemKind)

    if (sortBy === 'most_sold') {
      query.orderByRaw(`${MOST_SOLD_SQL} ${sortDir === 'desc' ? 'DESC' : 'ASC'}`)
    } else {
      query.orderBy('name', sortDir)
    }

    query.orderBy('id', 'desc')

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<CatalogProduct> {
    const product = await CatalogProduct.query()
      .where('id', id)
      .preload('sizes', (q) => q.orderBy('size', 'asc'))
      .first()
    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }
    return product
  }

  async obtenerDetalle(id: number): Promise<CatalogProduct> {
    const product = await CatalogProduct.query()
      .where('id', id)
      .preload('formula', (q) =>
        q.preload('materials', (mq) => mq.preload('material').orderBy('id', 'asc'))
      )
      .preload('sizes', (q) => q.orderBy('size', 'asc'))
      .first()

    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    return product
  }

  async historialCompras(
    productId: number,
    filters: CatalogProductPurchaseHistoryFilters = {}
  ): Promise<CatalogProductPurchaseHistoryItem[]> {
    await this.obtener(productId)

    const query = PurchaseItem.query()
      .select('purchase_items.*')
      .join('purchases', 'purchases.id', 'purchase_items.purchase_id')
      .where('purchase_items.catalog_product_id', productId)
      .where('purchases.status', 'CONFIRMED')
      .orderBy('purchases.date', 'desc')
      .orderBy('purchase_items.id', 'desc')
      .preload('purchase', (purchaseQuery) => {
        purchaseQuery.preload('supplier')
      })

    const period = resolvePurchaseHistoryPeriod(filters)
    if (period) {
      query.where('purchases.date', '>=', period.from)
      query.where('purchases.date', '<=', period.to)
    }

    const items = await query

    return items.map((item) => {
      const supplier = item.purchase.supplier
      return {
        purchaseItemId: Number(item.id),
        purchaseId: Number(item.purchaseId),
        date: item.purchase.date.toISODate()!,
        supplier: supplier
          ? {
              id: Number(supplier.id),
              code: supplier.rif?.trim() || null,
              name: supplier.name,
            }
          : {
              id: 0,
              code: null,
              name: 'Sin proveedor',
            },
        quantity: item.quantity,
        unitPriceUsd: item.unitPriceUsd,
        subtotalUsd: item.subtotalUsd,
      }
    })
  }
}

function resolvePurchaseHistoryPeriod(filters: CatalogProductPurchaseHistoryFilters) {
  if (filters.month) {
    const start = DateTime.fromISO(`${filters.month}-01`).startOf('month')
    return {
      from: start.toISODate()!,
      to: start.endOf('month').toISODate()!,
    }
  }

  if (filters.from) {
    return { from: filters.from, to: filters.to || filters.from }
  }

  return null
}
