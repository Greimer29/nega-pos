import SalesShift from '#models/sales_shift'
import TurnoNoAbiertoException from '#exceptions/turno_no_abierto_exception'
import TurnoNoEncontradoException from '#exceptions/turno_no_encontrado_exception'
import TurnoYaAbiertoException from '#exceptions/turno_ya_abierto_exception'
import TurnoYaCerradoException from '#exceptions/turno_ya_cerrado_exception'
import { broadcastCompanyEvent } from '#services/company_realtime_service'
import { APP_TIMEZONE, nowInAppZone } from '#utils/app_timezone'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

export type ListSalesShiftsFilters = {
  page?: number
  perPage?: number
  status?: 'OPEN' | 'CLOSED'
}

export default class SalesShiftService {
  async current(): Promise<SalesShift | null> {
    return SalesShift.query().where('status', 'OPEN').orderBy('id', 'desc').first()
  }

  async requireOpen(trx?: TransactionClientContract): Promise<SalesShift> {
    const query = SalesShift.query({ client: trx }).where('status', 'OPEN').orderBy('id', 'desc')
    if (trx) {
      query.forUpdate()
    }
    const shift = await query.first()
    if (!shift) {
      throw new TurnoNoAbiertoException()
    }
    return shift
  }

  async listar(filters: ListSalesShiftsFilters = {}) {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 30

    const query = SalesShift.query().orderBy('openedAt', 'desc').orderBy('id', 'desc')
    if (filters.status) {
      query.where('status', filters.status)
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<SalesShift> {
    const shift = await SalesShift.find(id)
    if (!shift) {
      throw new TurnoNoEncontradoException()
    }
    return shift
  }

  async abrir(userId: number, notes?: string | null): Promise<SalesShift> {
    const shift = await db.transaction(async (trx) => {
      const existing = await SalesShift.query({ client: trx })
        .where('status', 'OPEN')
        .forUpdate()
        .first()

      if (existing) {
        throw new TurnoYaAbiertoException()
      }

      const created = new SalesShift()
      created.openedAt = DateTime.now()
      created.closedAt = null
      created.openedByUserId = userId
      created.closedByUserId = null
      created.status = 'OPEN'
      created.notes = notes?.trim() ? notes.trim() : null
      created.useTransaction(trx)
      await created.save()

      return created
    })
    broadcastCompanyEvent('shift.changed')
    return shift
  }

  async cerrar(id: number, userId: number): Promise<SalesShift> {
    const shift = await db.transaction(async (trx) => {
      const current = await SalesShift.query({ client: trx }).where('id', id).forUpdate().first()

      if (!current) {
        throw new TurnoNoEncontradoException()
      }

      if (current.status !== 'OPEN') {
        throw new TurnoYaCerradoException()
      }

      current.status = 'CLOSED'
      current.closedAt = DateTime.now()
      current.closedByUserId = userId
      current.useTransaction(trx)
      await current.save()

      return current
    })
    broadcastCompanyEvent('shift.changed')
    return shift
  }

  /**
   * Calendar dates (YYYY-MM-DD in America/Caracas) spanned by the shift window.
   * Used for expenses that only store a DATE column.
   */
  calendarDatesForShift(shift: { openedAt: DateTime; closedAt: DateTime | null }): string[] {
    const start = shift.openedAt.setZone(APP_TIMEZONE).startOf('day')
    const end = (shift.closedAt ?? nowInAppZone()).setZone(APP_TIMEZONE).startOf('day')

    const dates: string[] = []
    let cursor = start
    while (cursor <= end) {
      dates.push(cursor.toISODate()!)
      cursor = cursor.plus({ days: 1 })
    }

    return dates.length > 0 ? dates : [nowInAppZone().toISODate()!]
  }
}
