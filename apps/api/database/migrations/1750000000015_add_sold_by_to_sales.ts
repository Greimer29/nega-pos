import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('sales', (table) => {
      table
        .bigInteger('sold_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable('sales', (table) => {
      table.dropForeign(['sold_by_user_id'])
      table.dropColumn('sold_by_user_id')
    })
  }
}
