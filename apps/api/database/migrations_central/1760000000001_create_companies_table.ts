import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'companies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('slug', 80).notNullable().unique()
      table.string('name', 150).notNullable()
      table.string('db_name', 100).notNullable().unique()
      table
        .enum('status', ['PROVISIONING', 'ACTIVE', 'SUSPENDED'])
        .notNullable()
        .defaultTo('PROVISIONING')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
