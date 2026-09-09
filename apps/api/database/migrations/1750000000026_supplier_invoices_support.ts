import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('expenses', (table) => {
      table
        .bigInteger('supplier_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('suppliers')
        .onDelete('SET NULL')
        .after('account_id')
      table.string('invoice_number', 50).nullable().after('description')
      table.index(['supplier_id'])
    })

    this.schema.alterTable('purchases', (table) => {
      table.boolean('affects_inventory').notNullable().defaultTo(true).after('is_credit')
    })
  }

  async down() {
    this.schema.alterTable('purchases', (table) => {
      table.dropColumn('affects_inventory')
    })

    this.schema.alterTable('expenses', (table) => {
      table.dropIndex(['supplier_id'])
      table.dropForeign(['supplier_id'])
      table.dropColumn('supplier_id')
      table.dropColumn('invoice_number')
    })
  }
}
