import { OrderMaterialSchema } from '#database/schema'
import Material from '#models/material'
import Order from '#models/order'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrderMaterial extends OrderMaterialSchema {
  static table = 'order_materials'

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => Material)
  declare material: BelongsTo<typeof Material>
}
