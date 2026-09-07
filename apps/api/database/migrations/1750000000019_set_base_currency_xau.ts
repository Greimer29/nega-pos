import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Cutover: moneda base del sistema = XAU.
 * - 1 XAU = 100 USD (USD.rate_per_usd = 100)
 * - Montos canónicos históricos (antes en USD) se dividen por 100
 * - rate_per_usd de monedas no-USD/XAU se multiplica por 100
 *
 * IMPORTANT: use `this.db` (migration client), never the global Lucid `db`
 * service. Global `db` targets the default connection (`railway` on Railway)
 * and breaks multi-tenant provision.
 */
export default class extends BaseSchema {
  private readonly factor = 100

  async up() {
    const now = new Date()

    await this.defer(async () => {
      await this.db.transaction(async (trx) => {
        const salesCountRow = await trx.from('sales').count('* as total').first()
        const salesTotal = Number(
          (salesCountRow as { total?: number | string } | null)?.total ?? 0
        )

        // Fresh company DB (no historical sales): default base = USD.
        // Legacy cutover to XAU only applies when there is existing transactional data.
        if (salesTotal === 0) {
          await trx
            .table('app_settings')
            .insert({
              key: 'base_currency_code',
              value: 'USD',
              updated_at: now,
            })
            .onConflict('key')
            .merge({ value: 'USD', updated_at: now })

          const ensureCurrency = async (
            code: string,
            name: string,
            ratePerUsd: string
          ) => {
            const existing = await trx.from('currencies').where('code', code).first()
            if (existing) {
              await trx.from('currencies').where('code', code).update({
                name,
                rate_per_usd: ratePerUsd,
                is_active: true,
                updated_at: now,
              })
            } else {
              await trx.table('currencies').insert({
                code,
                name,
                rate_per_usd: ratePerUsd,
                is_active: true,
                created_at: now,
                updated_at: now,
              })
            }
          }

          await ensureCurrency('USD', 'Dólar estadounidense', '1.0000')
          await ensureCurrency('VES', 'Bolívar', '36.0000')
          return
        }

        await trx
          .table('app_settings')
          .insert({
            key: 'base_currency_code',
            value: 'XAU',
            updated_at: now,
          })
          .onConflict('key')
          .merge({ value: 'XAU', updated_at: now })

        const existingXau = await trx.from('currencies').where('code', 'XAU').first()
        if (existingXau) {
          await trx.from('currencies').where('code', 'XAU').update({
            name: 'Oro',
            rate_per_usd: '1.0000',
            is_active: true,
            updated_at: now,
          })
        } else {
          await trx.table('currencies').insert({
            code: 'XAU',
            name: 'Oro',
            rate_per_usd: '1.0000',
            is_active: true,
            created_at: now,
            updated_at: now,
          })
        }

        await trx.from('currencies').where('code', 'USD').update({
          rate_per_usd: this.factor.toFixed(4),
          updated_at: now,
        })

        await trx.rawQuery(
          `UPDATE currencies
           SET rate_per_usd = ROUND(rate_per_usd * ?, 4), updated_at = ?
           WHERE code NOT IN ('XAU', 'USD')`,
          [this.factor, now]
        )

        const updates: Array<[string, string]> = [
          ['sales', 'total_usd'],
          ['sales', 'amount_paid_usd'],
          ['sales', 'balance_usd'],
          ['sale_lines', 'unit_price_usd'],
          ['sale_lines', 'subtotal_usd'],
          ['sale_lines', 'cost_usd'],
          ['purchases', 'total_usd'],
          ['purchases', 'amount_paid_usd'],
          ['purchases', 'balance_usd'],
          ['purchase_items', 'unit_price_usd'],
          ['purchase_items', 'subtotal_usd'],
          ['orders', 'amount_paid_usd'],
          ['orders', 'balance_usd'],
          ['orders', 'total_price'],
          ['order_lines', 'unit_price_usd'],
          ['order_lines', 'subtotal_usd'],
          ['order_lines', 'cost_usd'],
          ['catalog_products', 'sale_price_usd'],
          ['catalog_products', 'previous_sale_price_usd'],
          ['catalog_products', 'cost_usd'],
          ['materials', 'last_purchase_price_usd'],
          ['materials', 'sale_price_usd'],
          ['materials', 'previous_sale_price_usd'],
          ['materials', 'previous_purchase_price_usd'],
          ['materials', 'reference_sale_price_usd'],
          ['materials', 'reference_cost_usd'],
          ['expenses', 'amount_usd'],
          ['customer_payments', 'amount_usd'],
          ['supplier_payments', 'amount_usd'],
        ]

        for (const [table, column] of updates) {
          await trx.rawQuery(
            `UPDATE \`${table}\`
             SET \`${column}\` = ROUND(\`${column}\` / ?, 4)
             WHERE \`${column}\` IS NOT NULL`,
            [this.factor]
          )
        }

        await trx.rawQuery(
          `UPDATE machine_expenses
           SET amount = ROUND(amount / ?, 4)
           WHERE UPPER(currency_code) = 'USD'`,
          [this.factor]
        )

        await trx.rawQuery(
          `UPDATE expenses SET currency_code = 'XAU' WHERE UPPER(currency_code) = 'USD'`
        )
        await trx.rawQuery(
          `UPDATE machine_expenses SET currency_code = 'XAU' WHERE UPPER(currency_code) = 'USD'`
        )

        const ves = await trx.from('currencies').where('code', 'VES').first()
        if (ves) {
          await trx
            .table('app_settings')
            .insert({
              key: 'current_usd_rate',
              value: String(ves.rate_per_usd),
              updated_at: now,
            })
            .onConflict('key')
            .merge({ value: String(ves.rate_per_usd), updated_at: now })
        }
      })
    })
  }

  async down() {
    await this.defer(async () => {
      await this.db.transaction(async (trx) => {
        const now = new Date()
        const updates: Array<[string, string]> = [
          ['sales', 'total_usd'],
          ['sales', 'amount_paid_usd'],
          ['sales', 'balance_usd'],
          ['sale_lines', 'unit_price_usd'],
          ['sale_lines', 'subtotal_usd'],
          ['sale_lines', 'cost_usd'],
          ['purchases', 'total_usd'],
          ['purchases', 'amount_paid_usd'],
          ['purchases', 'balance_usd'],
          ['purchase_items', 'unit_price_usd'],
          ['purchase_items', 'subtotal_usd'],
          ['orders', 'amount_paid_usd'],
          ['orders', 'balance_usd'],
          ['orders', 'total_price'],
          ['order_lines', 'unit_price_usd'],
          ['order_lines', 'subtotal_usd'],
          ['order_lines', 'cost_usd'],
          ['catalog_products', 'sale_price_usd'],
          ['catalog_products', 'previous_sale_price_usd'],
          ['catalog_products', 'cost_usd'],
          ['materials', 'last_purchase_price_usd'],
          ['materials', 'sale_price_usd'],
          ['materials', 'previous_sale_price_usd'],
          ['materials', 'previous_purchase_price_usd'],
          ['materials', 'reference_sale_price_usd'],
          ['materials', 'reference_cost_usd'],
          ['expenses', 'amount_usd'],
          ['customer_payments', 'amount_usd'],
          ['supplier_payments', 'amount_usd'],
        ]

        for (const [table, column] of updates) {
          await trx.rawQuery(
            `UPDATE \`${table}\`
             SET \`${column}\` = ROUND(\`${column}\` * ?, 4)
             WHERE \`${column}\` IS NOT NULL`,
            [this.factor]
          )
        }

        await trx.rawQuery(
          `UPDATE machine_expenses
           SET amount = ROUND(amount * ?, 4)
           WHERE UPPER(currency_code) = 'XAU'`,
          [this.factor]
        )

        await trx.rawQuery(
          `UPDATE expenses SET currency_code = 'USD' WHERE UPPER(currency_code) = 'XAU'`
        )
        await trx.rawQuery(
          `UPDATE machine_expenses SET currency_code = 'USD' WHERE UPPER(currency_code) = 'XAU'`
        )

        await trx.rawQuery(
          `UPDATE currencies
           SET rate_per_usd = ROUND(rate_per_usd / ?, 4), updated_at = ?
           WHERE code NOT IN ('XAU', 'USD')`,
          [this.factor, now]
        )

        await trx.from('currencies').where('code', 'USD').update({
          rate_per_usd: '1.0000',
          updated_at: now,
        })

        await trx.from('app_settings').where('key', 'base_currency_code').update({
          value: 'USD',
          updated_at: now,
        })
      })
    })
  }
}
