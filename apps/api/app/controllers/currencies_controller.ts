import CurrencyService from '#services/currency_service'
import {
  createCurrencyValidator,
  listCurrenciesValidator,
  updateCurrencyValidator,
} from '#validators/currency'
import { serializeCurrency } from '#transformers/currency_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class CurrenciesController {
  private service = new CurrencyService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listCurrenciesValidator)
    const currencies = await this.service.listar(filters.active ?? false)

    return serialize({
      currencies: currencies.map((currency) => serializeCurrency(currency)),
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCurrencyValidator)
    const currency = await this.service.crear(payload)

    return serialize({
      currency: serializeCurrency(currency),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateCurrencyValidator)
    const currency = await this.service.actualizar(params.code, payload)

    return serialize({
      currency: serializeCurrency(currency),
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(params.code)

    return serialize(result)
  }
}
