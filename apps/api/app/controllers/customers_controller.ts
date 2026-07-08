import CustomerService from '#services/customer_service'
import CustomerPaymentService from '#services/customer_payment_service'
import { serializeCustomer, serializeCustomerConOrders } from '#transformers/customer_transformer'
import {
  createCustomerValidator,
  listCustomersValidator,
  updateCustomerValidator,
} from '#validators/customer'
import { createCustomerPaymentValidator } from '#validators/payment'
import type { HttpContext } from '@adonisjs/core/http'

export default class CustomersControleler {
  private service = new CustomerService()
  private paymentService = new CustomerPaymentService()

  /**
   * GET /api/v1/customers
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listCustomersValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      type: filters.type,
      active: filters.active,
    })

    return serialize({
      customers: paginator.all().map((customer) => serializeCustomer(customer)),
      meta: paginator.getMeta(),
    })
  }

  /**
   * GET /api/v1/customers/:id
   */
  async show({ params, serialize }: HttpContext) {
    const customer = await this.service.obtenerConOrders(Number(params.id))

    return serialize({
      customer: serializeCustomerConOrders(customer),
    })
  }

  /**
   * POST /api/v1/customers
   */
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCustomerValidator)
    const customer = await this.service.crear(payload)

    return serialize({
      customer: serializeCustomer(customer),
    })
  }

  /**
   * PUT /api/v1/customers/:id
   */
  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateCustomerValidator)
    const customer = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      customer: serializeCustomer(customer),
    })
  }

  /**
   * DELETE /api/v1/customers/:id
   */
  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: true,
      modo: result.modo,
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

    const customer = await this.service.guardarImagen(Number(params.id), image)

    return serialize({
      customer: serializeCustomer(customer),
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
    const customer = await this.service.eliminarImagen(Number(params.id))

    return serialize({
      customer: serializeCustomer(customer),
    })
  }

  async accountStatement({ params, serialize }: HttpContext) {
    const data = await this.paymentService.estadoCuenta(Number(params.id))

    return serialize({
      customer: serializeCustomer(data.customer),
      sales: data.sales.map((sale) => ({
        id: Number(sale.id),
        code: sale.code,
        status: sale.status,
        billingMode: sale.billingMode,
        orderStatus: sale.orderStatus,
        paymentType: sale.paymentType,
        soldAt: sale.soldAt?.toISO() ?? null,
        confirmedAt: sale.confirmedAt?.toISO() ?? null,
        totalUsd: sale.totalUsd,
        amountPaidUsd: sale.amountPaidUsd,
        balanceUsd: sale.balanceUsd,
        creditDueDate: sale.creditDueDate?.toISODate() ?? null,
        guestName: sale.guestName,
      })),
      payments: data.payments.map((payment) => ({
        id: Number(payment.id),
        saleId: payment.saleId ? Number(payment.saleId) : null,
        orderId: payment.orderId ? Number(payment.orderId) : null,
        amountUsd: payment.amountUsd,
        date: payment.date.toISODate(),
        note: payment.note,
      })),
      saldoPendienteUsd: data.saldoPendienteUsd,
    })
  }

  async storePayment({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCustomerPaymentValidator)
    const payment = await this.paymentService.registrar({
      ...payload,
      customer_id: Number(params.id),
    })

    return serialize({
      payment: {
        id: Number(payment.id),
        customerId: Number(payment.customerId),
        orderId: payment.orderId ? Number(payment.orderId) : null,
        saleId: payment.saleId ? Number(payment.saleId) : null,
        amountUsd: payment.amountUsd,
        date: payment.date.toISODate(),
        note: payment.note,
      },
    })
  }
}
