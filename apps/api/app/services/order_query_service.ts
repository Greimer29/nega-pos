import OrderNoEncontradoException from '#exceptions/pedido_no_encontrado_exception'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import { datetimeRangeUtcSql, dayStartUtcSql } from '#utils/app_timezone'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type ListOrdersFilters = {
  page?: number
  perPage?: number
  customer_id?: number
  status?: string
  exclude_status?: string
  modality?: string
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: 'order_date' | 'code' | 'created_at' | 'confirmed_at'
  direction?: 'asc' | 'desc'
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

const ORDER_COLUMN: Record<NonNullable<ListOrdersFilters['sort_by']>, string> = {
  order_date: 'order_date',
  code: 'code',
  created_at: 'created_at',
  confirmed_at: 'confirmed_at',
}

export default class OrderQueryService {
  async listar(filters: ListOrdersFilters = {}): Promise<ModelPaginatorContract<Order>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const sortBy = filters.sort_by ?? 'order_date'
    const direction = filters.direction ?? 'desc'
    const column = ORDER_COLUMN[sortBy]

    const query = Order.query()
      .preload('customer')
      .preload('orderLines', (linesQuery) => linesQuery.preload('catalogProduct'))
      .orderBy(column, direction)
      .orderBy('id', 'desc')

    if (filters.customer_id) {
      query.where('customerId', filters.customer_id)
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.exclude_status) {
      query.whereNot('status', filters.exclude_status)
    }

    if (filters.modality) {
      query.where('modality', filters.modality)
    }

    // Confirmed orders filter by the Caracas day of confirmed_at; drafts fall back to order_date.
    if (filters.date_from) {
      const fromSql = dayStartUtcSql(filters.date_from)
      query.where((builder) => {
        builder.where('confirmedAt', '>=', fromSql).orWhere((sub) => {
          sub.whereNull('confirmedAt').where('orderDate', '>=', filters.date_from!)
        })
      })
    }

    if (filters.date_to) {
      const { toExclusiveSql } = datetimeRangeUtcSql(filters.date_to, filters.date_to)
      query.where((builder) => {
        builder.where('confirmedAt', '<', toExclusiveSql).orWhere((sub) => {
          sub.whereNull('confirmedAt').where('orderDate', '<=', filters.date_to!)
        })
      })
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('code', term)
          .orWhereILike('description', term)
          .orWhereHas('customer', (customerQuery) => {
            customerQuery.whereILike('name', term)
          })
          .orWhereHas('orderLines', (lineQuery) => {
            lineQuery.whereHas('catalogProduct', (productQuery) => {
              productQuery.whereILike('name', term)
            })
          })
      })
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<Order> {
    const order = await Order.find(id)
    if (!order) {
      throw new OrderNoEncontradoException()
    }
    return order
  }

  async obtenerDetalle(id: number): Promise<Order> {
    const order = await Order.query()
      .where('id', id)
      .preload('customer')
      .preload('orderLines', (query) => {
        query.preload('catalogProduct').orderBy('id', 'asc')
      })
      .preload('orderMaterials', (query) => {
        query.preload('material').orderBy('id', 'asc')
      })
      .first()

    if (!order) {
      throw new OrderNoEncontradoException()
    }

    return order
  }

  async obtenerPresupuesto(orderId: number): Promise<OrderBudget> {
    await this.obtener(orderId)
    const lines = await OrderLine.query()
      .where('orderId', orderId)
      .preload('catalogProduct')
      .orderBy('id', 'asc')

    let total = 0
    const serialized = lines.map((line) => {
      const subtotal = Number(line.subtotalUsd)
      total += subtotal
      return {
        id: Number(line.id),
        catalog_product_id: Number(line.catalogProductId),
        product_name: line.catalogProduct?.name ?? '',
        quantity: line.quantity,
        unit_price_usd: line.unitPriceUsd,
        subtotal_usd: line.subtotalUsd,
      }
    })

    return { lines: serialized, total_usd: total.toFixed(4) }
  }
}
