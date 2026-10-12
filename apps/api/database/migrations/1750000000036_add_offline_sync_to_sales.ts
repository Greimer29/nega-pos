import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sales'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('offline_client_id', 64).nullable().unique()
      table.boolean('needs_stock_review').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('offline_client_id')
      table.dropColumn('needs_stock_review')
    })
  }
}
