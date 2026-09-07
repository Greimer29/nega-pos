import ReportService from '#services/report_service'
import InventoryReportService from '#services/inventory_report_service'
import {
  accountStatementValidator,
  inventoryMovementsValidator,
  inventoryReportValidator,
} from '#validators/report'
import type { HttpContext } from '@adonisjs/core/http'

export default class ReportsController {
  private service = new ReportService()
  private inventoryService = new InventoryReportService()

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

  async inventory({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(inventoryReportValidator)
    const result = await this.inventoryService.snapshot(filters)

    return serialize({
      products: result.products,
      meta: result.meta,
    })
  }

  async inventoryMovements({ params, request, serialize }: HttpContext) {
    const productId = Number(params.productId)
    const filters = await request.validateUsing(inventoryMovementsValidator)
    const result = await this.inventoryService.productMovements(productId, filters)

    return serialize({
      product: result.product,
      movements: result.movements,
      meta: result.meta,
      period: result.period,
    })
  }
}
