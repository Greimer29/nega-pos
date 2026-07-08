import MaterialService from '#services/material_service'
import { serializeMaterial, serializeMovimientos } from '#transformers/material_transformer'
import {
  ajusteMaterialValidator,
  createMaterialValidator,
  listMaterialsValidator,
  updateMaterialValidator,
} from '#validators/material'
import { serializeCostWarning } from '#types/cost_warning'
import type { HttpContext } from '@adonisjs/core/http'

export default class MaterialsControleler {
  private service = new MaterialService()

  /**
   * GET /api/v1/materials
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listMaterialsValidator)
    const { paginator, stockById, stockComprometidoById, metricsById } = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      category: filters.category,
      active: filters.active,
      lowStock: filters.low_stock,
      status: filters.status,
      sortBy: filters.sort_by,
      sortDir: filters.sort_dir,
    })

    return serialize({
      materials: paginator.all().map((material) => {
        const id = Number(material.id)
        const metrics = metricsById.get(id)

        return serializeMaterial(material, {
          stockActual: stockById.get(id) ?? 0,
          stockComprometido: stockComprometidoById.get(id) ?? 0,
          purchasedQty: metrics?.purchasedQty,
          usedQty: metrics?.usedQty,
          flowQty: metrics?.flowQty,
          rating: metrics?.rating,
        })
      }),
      meta: paginator.getMeta(),
    })
  }

  /**
   * GET /api/v1/materials/:id
   */
  async show({ params, serialize }: HttpContext) {
    const detalle = await this.service.obtenerDetalle(Number(params.id))

    return serialize({
      material: serializeMaterial(detalle.material, {
        stockActual: detalle.stockActual,
        stockComprometido: detalle.stockComprometido ?? 0,
        movimientos: serializeMovimientos(detalle.movimientos),
      }),
    })
  }

  /**
   * POST /api/v1/materials
   */
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createMaterialValidator)
    const material = await this.service.crear(payload)
    const stockActual = await this.service.calcularStock(Number(material.id))

    return serialize({
      material: serializeMaterial(material, { stockActual }),
    })
  }

  /**
   * PUT /api/v1/materials/:id
   */
  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateMaterialValidator)
    const { material, costWarnings } = await this.service.actualizar(Number(params.id), payload)
    const stockActual = await this.service.calcularStock(Number(material.id))

    return serialize({
      material: serializeMaterial(material, { stockActual }),
      cost_warnings: costWarnings.map(serializeCostWarning),
    })
  }

  /**
   * DELETE /api/v1/materials/:id
   */
  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: true,
      modo: result.modo,
    })
  }

  /**
   * POST /api/v1/materials/:id/adjustment
   */
  async ajuste({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(ajusteMaterialValidator)
    const movimiento = await this.service.ajustar(Number(params.id), payload)
    const stockActual = await this.service.calcularStock(Number(params.id))

    return serialize({
      movimiento: {
        id: Number(movimiento.id),
        type: movimiento.type,
        quantity: movimiento.quantity,
        note: movimiento.note,
        createdAt: movimiento.createdAt,
      },
      stockActual,
    })
  }

  /**
   * GET /api/v1/materials/:id/price-history
   */
  async historialPrecios({ params, serialize }: HttpContext) {
    const historial = await this.service.historialPrecios(Number(params.id))

    return serialize({
      historial,
    })
  }

  /**
   * POST /api/v1/materials/:id/image
   */
  async uploadImage({ params, request, response, serialize }: HttpContext) {
    const image = request.file('image', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    if (!image) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Debe adjuntar un archivo en el campo image',
        },
      })
    }

    if (!image.isValid) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: image.errors[0]?.message ?? 'El archivo no es válido',
        },
      })
    }

    const material = await this.service.guardarImagen(Number(params.id), image)
    const stockActual = await this.service.calcularStock(Number(material.id))

    return serialize({
      material: serializeMaterial(material, { stockActual }),
    })
  }

  /**
   * GET /api/v1/materials/:id/image
   */
  async downloadImage({ params, response }: HttpContext) {
    const { bytes, contentType, filename } = await this.service.obtenerImagen(Number(params.id))

    response.header('Content-Type', contentType)
    response.header('Content-Disposition', `inline; filename="${filename}"`)
    response.header('Cache-Control', 'public, max-age=86400')
    return response.send(bytes)
  }

  /**
   * DELETE /api/v1/materials/:id/image
   */
  async deleteImage({ params, serialize }: HttpContext) {
    const material = await this.service.eliminarImagen(Number(params.id))
    const stockActual = await this.service.calcularStock(Number(material.id))

    return serialize({
      material: serializeMaterial(material, { stockActual }),
    })
  }
}
