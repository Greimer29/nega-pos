import CounterOrderExcedidoException from '#exceptions/contador_pedido_excedido_exception'
import Counter from '#models/counter'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const INVOICE_SCOPE = 'invoice'
const MAX_INVOICES = 9_999_999_999

export default class SaleCodigoService {
  async preview(): Promise<string> {
    const counter = await Counter.query().where('scope', INVOICE_SCOPE).first()
    const next = (counter ? Number(counter.value) : 0) + 1
    return this.format(next)
  }

  async generar(trx: TransactionClientContract): Promise<string> {
    const now = DateTime.now().toSQL({ includeOffset: false })

    await trx.rawQuery(
      `INSERT INTO counters (scope, value, updated_at) VALUES (?, 1, ?)
       ON DUPLICATE KEY UPDATE value = value + 1, updated_at = VALUES(updated_at)`,
      [INVOICE_SCOPE, now]
    )

    const counter = await Counter.query({ client: trx }).where('scope', INVOICE_SCOPE).firstOrFail()
    const value = Number(counter.value)

    if (value > MAX_INVOICES) {
      throw new CounterOrderExcedidoException()
    }

    return this.format(value)
  }

  private format(value: number): string {
    return String(value).padStart(10, '0')
  }
}
