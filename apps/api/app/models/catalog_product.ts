import { CatalogProductSchema } from '#database/schema'
import Formula from '#models/formula'
import ProductInventoryMovement from '#models/product_inventory_movement'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class CatalogProduct extends CatalogProductSchema {
  static table = 'catalog_products'

  @belongsTo(() => Formula)
  declare formula: BelongsTo<typeof Formula>

  @hasMany(() => ProductInventoryMovement)
  declare movimientos: HasMany<typeof ProductInventoryMovement>
}
