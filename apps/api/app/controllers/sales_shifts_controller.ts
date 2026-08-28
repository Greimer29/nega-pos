import SalesShiftService from '#services/sales_shift_service'
import { serializeSalesShift } from '#transformers/sales_shift_transformer'
import { listSalesShiftsValidator, openSalesShiftValidator } from '#validators/sales_shift'
import type { HttpContext } from '@adonisjs/core/http'

export default class SalesShiftsController {
  private service = new SalesShiftService()

  async current({ serialize }: HttpContext) {
    const shift = await this.service.current()

    return serialize({
      sales_shift: shift ? serializeSalesShift(shift) : null,
    })
  }

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listSalesShiftsValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      status: filters.status,
    })

    return serialize({
      sales_shifts: paginator.all().map((shift) => serializeSalesShift(shift)),
      meta: paginator.getMeta(),
    })
  }

  async open({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(openSalesShiftValidator)
    const user = auth.getUserOrFail()
    const shift = await this.service.abrir(Number(user.id), payload.notes)

    return serialize({
      sales_shift: serializeSalesShift(shift),
    })
  }

  async close({ auth, params, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const shift = await this.service.cerrar(Number(params.id), Number(user.id))

    return serialize({
      sales_shift: serializeSalesShift(shift),
    })
  }
}
