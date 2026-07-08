import { InventoryMovementSchema } from '#database/schema'
import PurchaseItem from '#models/purchase_item'
import Material from '#models/material'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class InventoryMovement extends InventoryMovementSchema {
  static table = 'inventory_movements'

  @belongsTo(() => Material)
  declare material: BelongsTo<typeof Material>

  @belongsTo(() => PurchaseItem)
  declare purchaseItem: BelongsTo<typeof PurchaseItem>
}
