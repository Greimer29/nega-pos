import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Backfill: compras a crédito sin cuenta heredan account_id del abono más reciente
 * que tenga cuenta (supplier_payments.purchase_id).
 *
 * IMPORTANT: use `this.db` (migration client), never the global Lucid `db` service.
 */
export default class extends BaseSchema {
  async up() {
    await this.defer(async () => {
      await this.db.rawQuery(`
        UPDATE purchases p
        INNER JOIN (
          SELECT sp.purchase_id, MAX(sp.id) AS max_id
          FROM supplier_payments sp
          WHERE sp.purchase_id IS NOT NULL
            AND sp.account_id IS NOT NULL
          GROUP BY sp.purchase_id
        ) latest ON latest.purchase_id = p.id
        INNER JOIN supplier_payments sp ON sp.id = latest.max_id
        SET p.account_id = sp.account_id,
            p.updated_at = CURRENT_TIMESTAMP
        WHERE p.account_id IS NULL
      `)
    })
  }

  async down() {
    // Irreversible data backfill — intentional no-op.
  }
}
