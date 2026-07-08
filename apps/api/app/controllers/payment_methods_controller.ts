import PaymentMethodService from '#services/payment_method_service'
import {
  createPaymentMethodValidator,
  listPaymentMethodsValidator,
  updatePaymentMethodValidator,
} from '#validators/payment_method'
import { serializePaymentMethod } from '#transformers/payment_method_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class PaymentMethodsController {
  private service = new PaymentMethodService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listPaymentMethodsValidator)
    const methods = await this.service.listar(filters.active ?? false)

    return serialize({
      payment_methods: methods.map((method) => serializePaymentMethod(method)),
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createPaymentMethodValidator)
    const method = await this.service.crear(payload)

    return serialize({
      payment_method: serializePaymentMethod(method),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updatePaymentMethodValidator)
    const method = await this.service.actualizar(params.code, payload)

    return serialize({
      payment_method: serializePaymentMethod(method),
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(params.code)

    return serialize(result)
  }
}
