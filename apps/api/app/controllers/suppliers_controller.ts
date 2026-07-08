import SupplierService from '#services/supplier_service'
import SupplierPaymentService from '#services/supplier_payment_service'
import { serializeSupplier } from '#transformers/supplier_transformer'
import {
  createSupplierValidator,
  listSuppliersValidator,
  updateSupplierValidator,
} from '#validators/supplier'
import { createSupplierPaymentValidator } from '#validators/payment'
import type { HttpContext } from '@adonisjs/core/http'

export default class SuppliersControleler {
  private service = new SupplierService()
  private paymentService = new SupplierPaymentService()

  /**
   * GET /api/v1/suppliers
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listSuppliersValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      active: filters.active,
    })

    return serialize({
      suppliers: paginator.all().map((supplier) => serializeSupplier(supplier)),
      meta: paginator.getMeta(),
    })
  }

  /**
   * GET /api/v1/suppliers/:id
   */
  async show({ params, serialize }: HttpContext) {
    const supplier = await this.service.obtener(Number(params.id))
    return serialize({
      supplier: serializeSupplier(supplier),
    })
  }

  /**
   * POST /api/v1/suppliers
   */
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createSupplierValidator)
    const supplier = await this.service.crear(payload)

    return serialize({
      supplier: serializeSupplier(supplier),
    })
  }

  /**
   * PUT /api/v1/suppliers/:id
   */
  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateSupplierValidator)
    const supplier = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      supplier: serializeSupplier(supplier),
    })
  }

  /**
   * DELETE /api/v1/suppliers/:id
   */
  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: true,
      modo: result.modo,
    })
  }

  async accountStatement({ params, serialize }: HttpContext) {
    const data = await this.paymentService.estadoCuenta(Number(params.id))

    return serialize({
      supplier: serializeSupplier(data.supplier),
      purchases: data.purchases.map((purchase) => ({
        id: Number(purchase.id),
        date: purchase.date.toISODate(),
        invoiceNumber: purchase.invoiceNumber,
        totalUsd: purchase.totalUsd,
        amountPaidUsd: purchase.amountPaidUsd,
        balanceUsd: purchase.balanceUsd,
        creditDueDate: purchase.creditDueDate?.toISODate() ?? null,
        status: purchase.status,
        isCredit: Boolean(purchase.isCredit),
      })),
      payments: data.payments.map((payment) => ({
        id: Number(payment.id),
        purchaseId: payment.purchaseId ? Number(payment.purchaseId) : null,
        amountUsd: payment.amountUsd,
        date: payment.date.toISODate(),
        note: payment.note,
      })),
      saldoPendienteUsd: data.saldoPendienteUsd,
    })
  }

  async storePayment({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createSupplierPaymentValidator)
    const payment = await this.paymentService.registrar({
      ...payload,
      supplier_id: Number(params.id),
    })

    return serialize({
      payment: {
        id: Number(payment.id),
        supplierId: Number(payment.supplierId),
        purchaseId: payment.purchaseId ? Number(payment.purchaseId) : null,
        amountUsd: payment.amountUsd,
        date: payment.date.toISODate(),
        note: payment.note,
      },
    })
  }

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

    const supplier = await this.service.guardarImagen(Number(params.id), image)

    return serialize({
      supplier: serializeSupplier(supplier),
    })
  }

  async downloadImage({ params, response }: HttpContext) {
    const { bytes, contentType, filename } = await this.service.obtenerImagen(Number(params.id))
    response.header('Content-Type', contentType)
    response.header('Content-Disposition', `inline; filename="${filename}"`)
    response.header('Cache-Control', 'public, max-age=86400')
    return response.send(bytes)
  }

  async deleteImage({ params, serialize }: HttpContext) {
    const supplier = await this.service.eliminarImagen(Number(params.id))

    return serialize({
      supplier: serializeSupplier(supplier),
    })
  }
}
