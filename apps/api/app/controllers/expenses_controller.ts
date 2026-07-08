import ExpenseService from '#services/expense_service'
import { serializeExpense } from '#transformers/expense_transformer'
import {
  createExpenseValidator,
  listExpensesValidator,
  updateExpenseValidator,
} from '#validators/expense'
import type { HttpContext } from '@adonisjs/core/http'

export default class ExpensesController {
  private service = new ExpenseService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listExpensesValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      account_id: filters.account_id,
      unassigned: filters.unassigned,
    })

    const expenses = await Promise.all(paginator.all().map((expense) => serializeExpense(expense)))

    return serialize({
      expenses,
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
    const payload = await request.validateUsing(createExpenseValidator)
    const expense = await this.service.crear(payload)

    return serialize({
      expense: await serializeExpense(expense),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateExpenseValidator)
    const expense = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      expense: await serializeExpense(expense),
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
