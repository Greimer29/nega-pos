import ReportService from '#services/report_service'
import { accountStatementValidator } from '#validators/report'
import type { HttpContext } from '@adonisjs/core/http'

export default class ReportsController {
  private service = new ReportService()

  async accountStatement({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(accountStatementValidator)

    const result = await this.service.estadoCuenta({
      from: filters.from,
      to: filters.to,
      month: filters.month,
      account_id: filters.account_id,
      unassigned: filters.unassigned,
      types: filters.types,
      display_currency: filters.display_currency,
    })

    return serialize({
      period: result.period,
      summary: result.summary,
      movements: result.movements,
    })
  }
}
