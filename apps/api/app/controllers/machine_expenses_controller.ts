import MachineExpenseService from '#services/machine_expense_service'
import { serializeMachineExpense } from '#transformers/machine_transformer'
import { listMachineExpensesValidator, updateMachineExpenseValidator } from '#validators/machine'
import type { HttpContext } from '@adonisjs/core/http'

export default class MachineExpensesControleler {
  private service = new MachineExpenseService()

  /**
   * GET /api/v1/machine-expenses
   */
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listMachineExpensesValidator)
    const { paginator, totalMonto } = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      machine_id: filters.machine_id,
      category: filters.category,
      supplier_id: filters.supplier_id,
      date_desde: filters.date_desde,
      date_hasta: filters.date_hasta,
      account_id: filters.account_id,
      unassigned: filters.unassigned,
    })

    return serialize({
      expenses: paginator.all().map((expense) => serializeMachineExpense(expense)),
      meta: {
        ...paginator.getMeta(),
        total_amount: totalMonto,
      },
    })
  }

  /**
   * PUT /api/v1/machine-expenses/:id
   */
  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateMachineExpenseValidator)
    const expense = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      expense: serializeMachineExpense(expense),
    })
  }

  /**
   * DELETE /api/v1/machine-expenses/:id
   */
  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: result.eliminado,
    })
  }

  /**
   * POST /api/v1/machine-expenses/:id/receipt
   */
  async uploadComprobante({ params, request, response, serialize }: HttpContext) {
    const comprobante = request.file('comprobante', {
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    })

    if (!comprobante) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Debe adjuntar un archivo en el campo comprobante',
        },
      })
    }

    if (!comprobante.isValid) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: comprobante.errors[0]?.message ?? 'El archivo no es válido',
        },
      })
    }

    const expense = await this.service.guardarComprobante(Number(params.id), comprobante)

    return serialize({
      expense: serializeMachineExpense(expense),
    })
  }

  /**
   * GET /api/v1/machine-expenses/:id/receipt
   */
  async downloadComprobante({ params, response }: HttpContext) {
    const { bytes, contentType, filename } = await this.service.obtenerComprobante(
      Number(params.id)
    )

    response.header('Content-Type', contentType)
    response.header('Content-Disposition', `inline; filename="${filename}"`)
    return response.send(bytes)
  }
}
