import PurchaseService from '#services/purchase_service'
import { serializePurchase, serializePurchaseItems } from '#transformers/purchase_transformer'
import {
  confirmPurchaseValidator,
  createPurchaseItemValidator,
  createPurchaseValidator,
  listPurchasesValidator,
  updatePurchaseItemValidator,
  updatePurchaseValidator,
} from '#validators/purchase'
import type { HttpContext } from '@adonisjs/core/http'
import { serializeCostWarning } from '#types/cost_warning'

export default class PurchasesControleler {
  private service = new PurchaseService()

  /**
   * GET /api/v1/purchases
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listPurchasesValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      supplier_id: filters.supplier_id,
      status: filters.status,
      date_desde: filters.date_desde,
      date_hasta: filters.date_hasta,
      account_id: filters.account_id,
      unassigned: filters.unassigned,
    })

    return serialize({
      purchases: paginator.all().map((purchase) => serializePurchase(purchase)),
      meta: paginator.getMeta(),
    })
  }

  /**
   * GET /api/v1/purchases/summary
   */
  async summary({ serialize }: HttpContext) {
    const summary = await this.service.resumen()

    return serialize({ summary })
  }

  /**
   * GET /api/v1/purchases/:id
   */
  async show({ params, serialize }: HttpContext) {
    const detalle = await this.service.obtenerDetalle(Number(params.id))

    return serialize({
      purchase: serializePurchase(detalle.purchase, {
        items: serializePurchaseItems(detalle.items),
      }),
    })
  }

  /**
   * POST /api/v1/purchases
   */
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createPurchaseValidator)
    const purchase = await this.service.crear(payload)

    return serialize({
      purchase: serializePurchase(purchase),
    })
  }

  /**
   * PUT /api/v1/purchases/:id
   */
  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updatePurchaseValidator)
    const purchase = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      purchase: serializePurchase(purchase),
    })
  }

  /**
   * DELETE /api/v1/purchases/:id
   */
  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: result.eliminado,
    })
  }

  /**
   * POST /api/v1/purchases/:id/items
   */
  async storeItem({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createPurchaseItemValidator)
    const item = await this.service.agregarItem(Number(params.id), payload)

    return serialize({
      item: serializePurchaseItems([item])[0],
    })
  }

  /**
   * PUT /api/v1/purchases/:id/items/:itemId
   */
  async updateItem({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updatePurchaseItemValidator)
    const item = await this.service.actualizarItem(
      Number(params.id),
      Number(params.itemId),
      payload
    )

    return serialize({
      item: serializePurchaseItems([item])[0],
    })
  }

  /**
   * DELETE /api/v1/purchases/:id/items/:itemId
   */
  async destroyItem({ params, serialize }: HttpContext) {
    const result = await this.service.eliminarItem(Number(params.id), Number(params.itemId))

    return serialize({
      id: result.id,
      eliminado: result.eliminado,
    })
  }

  /**
   * POST /api/v1/purchases/:id/confirm
   */
  async confirmar({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(confirmPurchaseValidator)
    const { purchase, costWarnings, fulfilledOrders } = await this.service.confirmar(
      Number(params.id),
      payload
    )
    const detalle = await this.service.obtenerDetalle(Number(purchase.id))

    return serialize({
      purchase: serializePurchase(detalle.purchase, {
        items: serializePurchaseItems(detalle.items),
      }),
      cost_warnings: costWarnings.map(serializeCostWarning),
      fulfilled_orders: fulfilledOrders,
    })
  }

  /**
   * POST /api/v1/purchases/:id/return
   */
  async devolver({ params, serialize }: HttpContext) {
    const purchase = await this.service.devolver(Number(params.id))
    const detalle = await this.service.obtenerDetalle(Number(purchase.id))

    return serialize({
      purchase: serializePurchase(detalle.purchase, {
        items: serializePurchaseItems(detalle.items),
      }),
    })
  }

  /**
   * POST /api/v1/purchases/:id/invoice
   */
  async uploadFactura({ params, request, response, serialize }: HttpContext) {
    const factura = request.file('factura', {
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    })

    if (!factura) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Debe adjuntar un archivo en el campo factura',
        },
      })
    }

    if (!factura.isValid) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: factura.errors[0]?.message ?? 'El archivo no es válido',
        },
      })
    }

    const purchase = await this.service.guardarFactura(Number(params.id), factura)

    return serialize({
      purchase: serializePurchase(purchase),
    })
  }

  /**
   * GET /api/v1/purchases/:id/invoice
   */
  async downloadFactura({ params, response }: HttpContext) {
    const { bytes, contentType, filename } = await this.service.obtenerFactura(Number(params.id))

    response.header('Content-Type', contentType)
    response.header('Content-Disposition', `inline; filename="${filename}"`)
    return response.send(bytes)
  }
}
