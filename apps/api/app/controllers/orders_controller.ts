import OrderService from '#services/order_service'
import { assertPermission } from '#permissions/check'
import { serializeOrder, serializeOrderListItem } from '#transformers/order_transformer'
import { serializeOrderMaterial } from '#transformers/order_material_transformer'
import {
  createOrderValidator,
  listOrdersValidator,
  returnOrderValidator,
  transitionOrderValidator,
  updateOrderValidator,
} from '#validators/order'
import {
  createOrderMaterialValidator,
  updateOrderMaterialValidator,
} from '#validators/order_material'
import { serializeOrderLine } from '#transformers/order_line_transformer'
import { createOrderLineValidator, updateOrderLineValidator } from '#validators/order_line'
import type { HttpContext } from '@adonisjs/core/http'

export default class OrdersController {
  private service = new OrderService()

  /**
   * GET /api/v1/orders
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listOrdersValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      customer_id: filters.customer_id,
      status: filters.status,
      exclude_status: filters.exclude_status,
      modality: filters.modality,
      date_from: filters.date_from,
      date_to: filters.date_to,
      search: filters.search,
      sort_by: filters.sort_by,
      direction: filters.direction,
    })

    return serialize({
      orders: paginator.all().map((order) => serializeOrderListItem(order)),
      meta: paginator.getMeta(),
    })
  }

  /**
   * GET /api/v1/orders/:id
   */
  async show({ params, serialize }: HttpContext) {
    const order = await this.service.obtenerDetalle(Number(params.id))

    return serialize({
      order: serializeOrder(order, {
        lines: order.orderLines.map((line) => serializeOrderLine(line)),
        materials: order.orderMaterials.map((item) =>
          serializeOrderMaterial(item, order.totalQuantity)
        ),
      }),
    })
  }

  /**
   * POST /api/v1/orders
   */
  async store({ request, serialize, auth }: HttpContext) {
    const payload = await request.validateUsing(createOrderValidator)

    if (payload.payment_type === 'CREDIT') {
      assertPermission(auth.getUserOrFail(), 'ventas.credit')
    }

    const order = await this.service.crear(payload)

    return serialize({
      order: serializeOrder(order),
    })
  }

  /**
   * PUT /api/v1/orders/:id
   */
  async update({ params, request, serialize, auth }: HttpContext) {
    const payload = await request.validateUsing(updateOrderValidator)

    if (payload.payment_type === 'CREDIT') {
      assertPermission(auth.getUserOrFail(), 'ventas.credit')
    }

    const order = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      order: serializeOrder(order),
    })
  }

  /**
   * DELETE /api/v1/orders/:id
   */
  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: result.eliminado,
    })
  }

  /**
   * POST /api/v1/orders/:id/materials
   */
  async storeMaterial({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createOrderMaterialValidator)
    const orderMaterial = await this.service.agregarMaterial(Number(params.id), payload)

    const order = await this.service.obtener(Number(params.id))

    return serialize({
      orderMaterial: serializeOrderMaterial(orderMaterial, order.totalQuantity),
    })
  }

  /**
   * PUT /api/v1/orders/:id/materials/:pmId
   */
  async updateMaterial({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateOrderMaterialValidator)
    const orderMaterial = await this.service.actualizarMaterial(
      Number(params.id),
      Number(params.pmId),
      payload
    )

    const order = await this.service.obtener(Number(params.id))

    return serialize({
      orderMaterial: serializeOrderMaterial(orderMaterial, order.totalQuantity),
    })
  }

  /**
   * DELETE /api/v1/orders/:id/materials/:pmId
   */
  async destroyMaterial({ params, serialize }: HttpContext) {
    const result = await this.service.eliminarMaterial(Number(params.id), Number(params.pmId))

    return serialize({
      id: result.id,
      eliminado: result.eliminado,
    })
  }

  /**
   * POST /api/v1/orders/:id/transition
   */
  async transition({ params, request, serialize, auth }: HttpContext) {
    const payload = await request.validateUsing(transitionOrderValidator)

    if (payload.payment_type === 'CREDIT') {
      assertPermission(auth.getUserOrFail(), 'ventas.credit')
    }

    const { order, warnings } = await this.service.transicionar(
      Number(params.id),
      payload.new_status,
      { force: payload.force, payment_type: payload.payment_type }
    )

    return serialize({
      order: serializeOrder(order, {
        lines: order.orderLines?.map((line) => serializeOrderLine(line)),
        materials: order.orderMaterials.map((item) =>
          serializeOrderMaterial(item, order.totalQuantity)
        ),
        warnings: warnings.length > 0 ? warnings : undefined,
      }),
    })
  }

  async storeLine({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createOrderLineValidator)
    const line = await this.service.agregarLinea(Number(params.id), payload)

    return serialize({
      order_line: serializeOrderLine(line),
    })
  }

  async updateLine({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateOrderLineValidator)
    const line = await this.service.actualizarLinea(
      Number(params.id),
      Number(params.lineId),
      payload
    )

    return serialize({
      order_line: serializeOrderLine(line),
    })
  }

  async destroyLine({ params, serialize }: HttpContext) {
    const result = await this.service.eliminarLinea(Number(params.id), Number(params.lineId))

    return serialize({
      id: result.id,
      eliminado: result.eliminado,
    })
  }

  async budget({ params, serialize }: HttpContext) {
    const budget = await this.service.obtenerPresupuesto(Number(params.id))

    return serialize({ budget })
  }

  async materialAvailability({ params, serialize }: HttpContext) {
    const availability = await this.service.evaluarDisponibilidadMateriales(Number(params.id))

    return serialize({
      sufficient: availability.sufficient,
      has_recipe: availability.has_recipe,
      missing: availability.missing,
    })
  }

  /**
   * POST /api/v1/orders/:id/return
   */
  async devolver({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(returnOrderValidator)
    const order = await this.service.devolver(Number(params.id), payload.lines)

    return serialize({
      order: serializeOrder(order, {
        lines: order.orderLines?.map((line) => serializeOrderLine(line)),
        materials: order.orderMaterials?.map((item) =>
          serializeOrderMaterial(item, order.totalQuantity)
        ),
      }),
    })
  }

  /**
   * POST /api/v1/orders/:id/reference
   */
  async uploadReferencia({ params, request, response, serialize }: HttpContext) {
    const referencia = request.file('referencia', {
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    })

    if (!referencia) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Debe adjuntar un archivo en el campo referencia',
        },
      })
    }

    if (!referencia.isValid) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: referencia.errors[0]?.message ?? 'El archivo no es válido',
        },
      })
    }

    const order = await this.service.guardarReferencia(Number(params.id), referencia)

    return serialize({
      order: serializeOrder(order),
    })
  }

  /**
   * GET /api/v1/orders/:id/reference
   */
  async downloadReferencia({ params, response }: HttpContext) {
    const { bytes, contentType, filename } = await this.service.obtenerReferencia(Number(params.id))

    response.header('Content-Type', contentType)
    response.header('Content-Disposition', `inline; filename="${filename}"`)
    return response.send(bytes)
  }
}
