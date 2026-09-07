import { BaseSchema } from '@adonisjs/lucid/schema'

const PRODUCT_MOVEMENT_TYPES = [
  'PURCHASE_IN',
  'SALE_OUT',
  'MANUAL_ADJUSTMENT',
  'MANUAL_CARGO',
  'MANUAL_DESCARGO',
  'REVERSAL_ADJUSTMENT',
  'PRICE_CHANGE',
] as const

const LEGACY_PRODUCT_MOVEMENT_TYPES = [
  'PURCHASE_IN',
  'SALE_OUT',
  'MANUAL_ADJUSTMENT',
  'MANUAL_CARGO',
  'MANUAL_DESCARGO',
  'REVERSAL_ADJUSTMENT',
] as const

export default class extends BaseSchema {
  protected tableName = 'product_inventory_movements'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .bigInteger('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .after('sale_id')
    })

    await this.db.rawQuery(
      `ALTER TABLE ${this.tableName} MODIFY COLUMN type ENUM(${PRODUCT_MOVEMENT_TYPES.map((t) => `'${t}'`).join(', ')}) NOT NULL`
    )
  }

  async down() {
    await this.db.rawQuery(
      `UPDATE ${this.tableName} SET type = 'MANUAL_ADJUSTMENT' WHERE type = 'PRICE_CHANGE'`
    )
    await this.db.rawQuery(
      `ALTER TABLE ${this.tableName} MODIFY COLUMN type ENUM(${LEGACY_PRODUCT_MOVEMENT_TYPES.map((t) => `'${t}'`).join(', ')}) NOT NULL`
    )

    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['created_by_user_id'])
      table.dropColumn('created_by_user_id')
    })
  }
}
