import VentaNoEncontradaException from '#exceptions/venta_no_encontrada_exception'
import Sale from '#models/sale'
import type { SaleStatus } from '#services/sale_service'
import { datetimeRangeUtcSql, dayStartUtcSql } from '#utils/app_timezone'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type ListSalesFilters = {
  page?: number
  perPage?: number
  customer_id?: number
  status?: SaleStatus
  exclude_status?: SaleStatus
  search?: string
  date_from?: string
  date_to?: string
}

export default class SaleQueryService {
  async listar(filters: ListSalesFilters = {}): Promise<ModelPaginatorContract<Sale>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Sale.query()
      .preload('customer')
      .preload('paymentMethod')
      .orderBy('soldAt', 'desc')
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

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('code', term)
          .orWhereILike('guestName', term)
          .orWhereHas('customer', (customerQuery) => {
            customerQuery.whereILike('name', term)
          })
      })
    }

    if (filters.date_from) {
      query.where('soldAt', '>=', dayStartUtcSql(filters.date_from))
    }

    if (filters.date_to) {
      const { toExclusiveSql } = datetimeRangeUtcSql(filters.date_to, filters.date_to)
      query.where('soldAt', '<', toExclusiveSql)
    }

    return query.paginate(page, perPage)
  }

  async obtenerDetalle(id: number): Promise<Sale> {
    const sale = await Sale.query()
      .where('id', id)
      .preload('customer')
      .preload('paymentMethod')
      .preload('soldBy')
      .preload('salePayments', (q) => {
        q.preload('paymentMethod').orderBy('sortOrder', 'asc').orderBy('id', 'asc')
      })
      .preload('saleLines', (q) => {
        q.preload('catalogProduct', (cp) =>
          cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        )
          .preload('material')
          .preload('saleLineMaterials', (slm) => slm.preload('material'))
          .orderBy('id', 'asc')
      })
      .first()

    if (!sale) {
      throw new VentaNoEncontradaException()
    }

    return sale
  }
}
