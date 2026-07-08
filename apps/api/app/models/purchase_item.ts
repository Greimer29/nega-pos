import { PurchaseItemSchema } from '#database/schema'
import Purchase from '#models/purchase'
import Material from '#models/material'
import CatalogProduct from '#models/catalog_product'
import InventoryMovement from '#models/inventory_movement'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class PurchaseItem extends PurchaseItemSchema {
  static table = 'purchase_items'

  @belongsTo(() => Purchase)
  declare purchase: BelongsTo<typeof Purchase>

  @belongsTo(() => Material)
  declare material: BelongsTo<typeof Material>

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>

  @hasMany(() => InventoryMovement)
  declare movimientos: HasMany<typeof InventoryMovement>
}
