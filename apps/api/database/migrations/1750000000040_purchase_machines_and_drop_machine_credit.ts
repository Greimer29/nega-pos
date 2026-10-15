import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('purchase_items', (table) => {
      table
        .bigInteger('machine_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('machines')
        .onDelete('RESTRICT')
      table.index(['machine_id'])
    })

    this.schema.alterTable('machines', (table) => {
      table
        .bigInteger('source_purchase_item_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('purchase_items')
        .onDelete('SET NULL')
      table.index(['source_purchase_item_id'])
    })

    // Cerrar crédito directo de máquinas: la CxP queda solo vía compras a proveedor.
    await this.defer(async () => {
      await this.db.rawQuery(`
        UPDATE machines
        SET
          is_credit = 0,
          balance_usd = 0,
          amount_paid_usd = COALESCE(acquisition_cost, 0),
          credit_due_date = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE is_credit = 1
      `)
    })
  }

  async down() {
    this.schema.alterTable('machines', (table) => {
      table.dropIndex(['source_purchase_item_id'])
      table.dropForeign(['source_purchase_item_id'])
      table.dropColumn('source_purchase_item_id')
    })

    this.schema.alterTable('purchase_items', (table) => {
      table.dropIndex(['machine_id'])
      table.dropForeign(['machine_id'])
      table.dropColumn('machine_id')
    })
  }
}
