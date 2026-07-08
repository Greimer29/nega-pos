import { OrderSchema } from '#database/schema'
import Customer from '#models/customer'
import OrderMaterial from '#models/order_material'
import OrderLine from '#models/order_line'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Order extends OrderSchema {
  static table = 'orders'

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @hasMany(() => OrderMaterial)
  declare orderMaterials: HasMany<typeof OrderMaterial>

  @hasMany(() => OrderLine)
  declare orderLines: HasMany<typeof OrderLine>
}
