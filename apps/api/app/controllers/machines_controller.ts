import ExpenseService from '#services/expense_service'
import MachineService from '#services/machine_service'
import { serializeExpense } from '#transformers/expense_transformer'
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
  private expenseService = new ExpenseService()

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

    const expenses = [
      ...(await Promise.all(detalle.expenses.map((expense) => serializeExpense(expense)))),
      ...detalle.legacyExpenses.map((expense) => ({
        ...serializeMachineExpense(expense),
        legacy: true as const,
      })),
    ]

    return serialize({
      machine: serializeMachine(detalle.machine, {
        totalSpent: detalle.totalSpent,
        expenses,
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
   * Lista gastos unificados (`expenses`) + legacy `machine_expenses` en meta.
   */
  async indexExpenses({ params, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listGastosPorMachineValidator)
    const { paginator, totalUsd, legacyExpenses, legacyTotalUsd } =
      await this.expenseService.listarPorMachine(Number(params.id), {
        page: filters.page,
        perPage: filters.per_page,
        account_id: filters.account_id,
        unassigned: filters.unassigned,
      })

    const expenses = await Promise.all(paginator.all().map((expense) => serializeExpense(expense)))

    return serialize({
      expenses: [
        ...expenses,
        ...legacyExpenses.map((expense) => ({
          ...serializeMachineExpense(expense),
          legacy: true as const,
        })),
      ],
      meta: {
        ...paginator.getMeta(),
        total_amount: (Number(totalUsd) + Number(legacyTotalUsd)).toFixed(4),
        total_usd: totalUsd,
        legacy_total_usd: legacyTotalUsd,
      },
    })
  }

  /**
   * POST /api/v1/machines/:id/expenses
   * Crea un gasto de empresa vinculado a la máquina (ya no escribe en machine_expenses).
   */
  async storeExpense({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createMachineExpenseValidator)
    const expense = await this.expenseService.crearParaMachine(Number(params.id), {
      date: payload.date,
      description: payload.description ?? '',
      amount: payload.amount,
      amount_usd: payload.amount_usd,
      currency_code: payload.currency_code,
      entry_rate: payload.entry_rate,
      account_id: payload.account_id,
    })

    return serialize({
      expense: await serializeExpense(expense),
    })
  }
}
