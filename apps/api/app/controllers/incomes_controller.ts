import IncomeService from '#services/income_service'
import { serializeIncome } from '#transformers/income_transformer'
import {
  createIncomeValidator,
  listIncomesValidator,
  updateIncomeValidator,
} from '#validators/income'
import type { HttpContext } from '@adonisjs/core/http'

export default class IncomesController {
  private service = new IncomeService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listIncomesValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      account_id: filters.account_id,
      unassigned: filters.unassigned,
    })

    const incomes = await Promise.all(paginator.all().map((income) => serializeIncome(income)))

    return serialize({
      incomes,
      meta: paginator.getMeta(),
    })
  }

  async summary({ serialize }: HttpContext) {
    const summary = await this.service.resumen()

    return serialize({
      summary,
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createIncomeValidator)
    const income = await this.service.crear(payload)

    return serialize({
      income: await serializeIncome(income),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateIncomeValidator)
    const income = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      income: await serializeIncome(income),
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: result.eliminado,
    })
  }
}
