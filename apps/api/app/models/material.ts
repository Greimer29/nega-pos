import { MaterialSchema } from '#database/schema'
import PurchaseItem from '#models/purchase_item'
import InventoryMovement from '#models/inventory_movement'
import OrderMaterial from '#models/order_material'
import Supplier from '#models/supplier'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Material extends MaterialSchema {
  static table = 'materials'

  @belongsTo(() => Supplier, {
    foreignKey: 'defaultSupplierId',
  })
  declare supplierHabitual: BelongsTo<typeof Supplier>

  @hasMany(() => InventoryMovement)
  declare movimientos: HasMany<typeof InventoryMovement>

  @hasMany(() => PurchaseItem)
  declare purchaseItems: HasMany<typeof PurchaseItem>

  @hasMany(() => OrderMaterial)
  declare orderMaterials: HasMany<typeof OrderMaterial>
}
