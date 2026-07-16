import CurrencyService from '#services/currency_service'
import {
  createCurrencyValidator,
  listCurrenciesValidator,
  updateCurrencyValidator,
} from '#validators/currency'
import { updateBaseCurrencyValidator } from '#validators/settings'
import { serializeCurrency } from '#transformers/currency_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class CurrenciesController {
  private service = new CurrencyService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listCurrenciesValidator)
    const [currencies, baseCurrencyCode] = await Promise.all([
      this.service.listar(filters.active ?? false),
      this.service.getBaseCurrencyCode(),
    ])

    return serialize({
      base_currency_code: baseCurrencyCode,
      currencies: currencies.map((currency) => serializeCurrency(currency)),
    })
  }

  async getBaseCurrency({ serialize }: HttpContext) {
    const baseCurrencyCode = await this.service.getBaseCurrencyCode()
    return serialize({ base_currency_code: baseCurrencyCode })
  }

  async updateBaseCurrency({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateBaseCurrencyValidator)
    const baseCurrencyCode = await this.service.setBaseCurrencyCode(payload.base_currency_code)
    return serialize({ base_currency_code: baseCurrencyCode })
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
