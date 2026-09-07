import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_verification_codes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table.string('email', 150).notNullable()
      table.string('code', 12).notNullable()
      table.enum('purpose', ['COMPANY_CREATE', 'LOGIN_OTP']).notNullable()
      table.json('payload').nullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('consumed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['email', 'purpose'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
