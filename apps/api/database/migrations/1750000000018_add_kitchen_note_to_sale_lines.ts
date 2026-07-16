import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sale_lines'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('kitchen_note').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('kitchen_note')
    })
  }
}
