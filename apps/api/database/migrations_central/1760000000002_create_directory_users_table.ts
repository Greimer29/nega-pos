import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'directory_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('email', 150).notNullable().unique()
      table.string('password', 255).nullable()
      table
        .bigInteger('company_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')
      table.enum('role', ['ADMIN', 'OPERATOR']).notNullable().defaultTo('OPERATOR')
      table.boolean('active').notNullable().defaultTo(true)
      table.string('google_sub', 255).nullable().unique()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
