import SalesShift from '#models/sales_shift'
import TurnoNoAbiertoException from '#exceptions/turno_no_abierto_exception'
import TurnoNoEncontradoException from '#exceptions/turno_no_encontrado_exception'
import TurnoYaAbiertoException from '#exceptions/turno_ya_abierto_exception'
import TurnoYaCerradoException from '#exceptions/turno_ya_cerrado_exception'
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
    return db.transaction(async (trx) => {
      const existing = await SalesShift.query({ client: trx })
        .where('status', 'OPEN')
        .forUpdate()
        .first()

      if (existing) {
        throw new TurnoYaAbiertoException()
      }

      const shift = new SalesShift()
      shift.openedAt = DateTime.now()
      shift.closedAt = null
      shift.openedByUserId = userId
      shift.closedByUserId = null
      shift.status = 'OPEN'
      shift.notes = notes?.trim() ? notes.trim() : null
      shift.useTransaction(trx)
      await shift.save()

      return shift
    })
  }

  async cerrar(id: number, userId: number): Promise<SalesShift> {
    return db.transaction(async (trx) => {
      const shift = await SalesShift.query({ client: trx }).where('id', id).forUpdate().first()

      if (!shift) {
        throw new TurnoNoEncontradoException()
      }

      if (shift.status !== 'OPEN') {
        throw new TurnoYaCerradoException()
      }

      shift.status = 'CLOSED'
      shift.closedAt = DateTime.now()
      shift.closedByUserId = userId
      shift.useTransaction(trx)
      await shift.save()

      return shift
    })
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
