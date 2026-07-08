import MachineExpenseService from '#services/machine_expense_service'
import MachineService from '#services/machine_service'
import { serializeMachineExpense, serializeMachine } from '#transformers/machine_transformer'
import {
  createMachineExpenseValidator,
  createMachineValidator,
  listGastosPorMachineValidator,
  listMachinesValidator,
  updateMachineValidator,
} from '#validators/machine'
import type { HttpContext } from '@adonisjs/core/http'

export default class MachinesControleler {
  private service = new MachineService()
  private expenseService = new MachineExpenseService()

  /**
   * GET /api/v1/machines
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listMachinesValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      type: filters.type,
      status: filters.status,
      active: filters.active,
    })

    return serialize({
      machines: paginator.all().map((machine) => serializeMachine(machine)),
      meta: paginator.getMeta(),
    })
  }

  /**
   * GET /api/v1/machines/:id
   */
  async show({ params, serialize }: HttpContext) {
    const detalle = await this.service.obtenerDetalle(Number(params.id))

    return serialize({
      machine: serializeMachine(detalle.machine, {
        totalSpent: detalle.totalSpent,
        expenses: detalle.expenses.map((expense) => serializeMachineExpense(expense)),
      }),
    })
  }

  /**
   * POST /api/v1/machines
   */
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createMachineValidator)
    const machine = await this.service.crear(payload)

    return serialize({
      machine: serializeMachine(machine),
    })
  }

  /**
   * PUT /api/v1/machines/:id
   */
  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateMachineValidator)
    const machine = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      machine: serializeMachine(machine),
    })
  }

  /**
   * DELETE /api/v1/machines/:id
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
   * GET /api/v1/machines/:id/expenses
   */
  async indexExpenses({ params, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listGastosPorMachineValidator)
    const { paginator, totalMonto } = await this.expenseService.listarPorMachine(
      Number(params.id),
      {
        page: filters.page,
        perPage: filters.per_page,
        category: filters.category,
        date_desde: filters.date_desde,
        date_hasta: filters.date_hasta,
        account_id: filters.account_id,
        unassigned: filters.unassigned,
      }
    )

    return serialize({
      expenses: paginator.all().map((expense) => serializeMachineExpense(expense)),
      meta: {
        ...paginator.getMeta(),
        total_amount: totalMonto,
      },
    })
  }

  /**
   * POST /api/v1/machines/:id/expenses
   */
  async storeExpense({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createMachineExpenseValidator)
    const expense = await this.expenseService.crear(Number(params.id), payload)

    return serialize({
      expense: serializeMachineExpense(expense),
    })
  }
}
