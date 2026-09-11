import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('expenses', (table) => {
      table
        .bigInteger('machine_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('machines')
        .onDelete('SET NULL')
        .after('supplier_id')
      table.index(['machine_id'])
    })
  }

  async down() {
    this.schema.alterTable('expenses', (table) => {
      table.dropIndex(['machine_id'])
      table.dropForeign(['machine_id'])
      table.dropColumn('machine_id')
    })
  }
}
