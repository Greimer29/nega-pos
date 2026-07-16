import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery('ALTER TABLE sales MODIFY COLUMN total_bs DECIMAL(15, 6) NULL')
  }

  async down() {
    await this.db.rawQuery('ALTER TABLE sales MODIFY COLUMN total_bs DECIMAL(15, 2) NULL')
  }
}
