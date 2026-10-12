import { broadcastCompanyEvent } from '#services/company_realtime_service'
import SaleService from '#services/sale_service'
import OfflineCatalogService from '#services/offline_catalog_service'
import SalesShiftService from '#services/sales_shift_service'
import { serializeSale, serializeSaleListItem } from '#transformers/sale_transformer'
import { parseRouteId } from '#utils/parse_route_id'
import {
  confirmSaleValidator,
  createSaleValidator,
  listSalesValidator,
  offlineSyncCloseShiftValidator,
  offlineSyncReturnValidator,
  offlineSyncSaleValidator,
  offlineSyncTransitionValidator,
  returnSaleValidator,
  transitionSaleValidator,
  updateSaleValidator,
} from '#validators/sale'
import type { HttpContext } from '@adonisjs/core/http'

export default class SalesController {
  private service = new SaleService()
  private offlineCatalogService = new OfflineCatalogService()
  private salesShiftService = new SalesShiftService()

  async nextCode({ serialize }: HttpContext) {
    const code = await this.service.previewNextCode()

    return serialize({
      next_code: code,
    })
  }

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listSalesValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      customer_id: filters.customer_id,
      status: filters.status,
      exclude_status: filters.exclude_status,
      search: filters.search,
      date_from: filters.date_from,
      date_to: filters.date_to,
    })

    return serialize({
      sales: paginator.all().map((sale) => serializeSaleListItem(sale)),
      meta: paginator.getMeta(),
    })
  }

  async show({ params, serialize }: HttpContext) {
    const sale = await this.service.obtenerDetalle(parseRouteId(params.id, 'factura'))

    return serialize({
      sale: serializeSale(sale),
    })
  }

  async store({ request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(createSaleValidator)
    const sale = await this.service.crear(
      payload.confirm ? { ...payload, sold_by_user_id: Number(auth.getUserOrFail().id) } : payload
    )
    // confirm:true already broadcasts inside sale_service.confirmar
    if (!payload.confirm) {
      broadcastCompanyEvent('sale.changed')
    }

    return serialize({
      sale: serializeSale(sale),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateSaleValidator)
    const sale = await this.service.actualizar(parseRouteId(params.id, 'factura'), payload)
    broadcastCompanyEvent('sale.changed')

    return serialize({
      sale: serializeSale(sale),
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(parseRouteId(params.id, 'factura'))
    broadcastCompanyEvent('sale.changed')

    return serialize(result)
  }

  async confirm({ params, request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(confirmSaleValidator)
    const user = auth.getUserOrFail()
    const sale = await this.service.confirmar(parseRouteId(params.id, 'factura'), {
      ...payload,
      sold_by_user_id: Number(user.id),
    })

    return serialize({
      sale: serializeSale(sale),
    })
  }

  async transition({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(transitionSaleValidator)
    const sale = await this.service.transicionar(
      parseRouteId(params.id, 'factura'),
      payload.order_status
    )
    broadcastCompanyEvent('sale.changed')

    return serialize({
      sale: serializeSale(sale),
    })
  }

  async returnSale({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(returnSaleValidator)
    const sale = await this.service.devolver(parseRouteId(params.id, 'factura'), payload.lines)

    return serialize({
      sale: serializeSale(sale),
    })
  }

  async offlineCatalog({ serialize }: HttpContext) {
    const catalog = await this.offlineCatalogService.buildSnapshot()
    return serialize({ catalog })
  }

  async syncOffline({ request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(offlineSyncSaleValidator)
    const user = auth.getUserOrFail()
    const result = await this.service.sincronizarOffline({
      ...payload,
      sold_by_user_id: Number(user.id),
    })

    return serialize({
      already_synced: result.alreadySynced,
      sale: serializeSale(result.sale),
    })
  }

  async syncOfflineReturn({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(offlineSyncReturnValidator)
    const sale = await this.service.devolver(payload.sale_id, payload.lines)
    return serialize({ sale: serializeSale(sale) })
  }

  async syncOfflineTransition({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(offlineSyncTransitionValidator)
    const sale = await this.service.transicionar(payload.sale_id, payload.order_status)
    broadcastCompanyEvent('sale.changed')
    return serialize({ sale: serializeSale(sale) })
  }

  async syncOfflineCloseShift({ request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(offlineSyncCloseShiftValidator)
    const user = auth.getUserOrFail()
    const shift = await this.salesShiftService.cerrar(payload.sales_shift_id, Number(user.id))
    // sales_shift_service.cerrar already broadcasts shift.changed
    return serialize({
      shift: {
        id: Number(shift.id),
        status: shift.status,
        closed_at: shift.closedAt?.toISO() ?? null,
      },
    })
  }
}
