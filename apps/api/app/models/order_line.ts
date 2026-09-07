import { OrderLineSchema } from '#database/schema'
import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Order from '#models/order'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrderLine extends OrderLineSchema {
  static table = 'order_lines'

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>

  @belongsTo(() => CatalogProductSize)
  declare catalogProductSize: BelongsTo<typeof CatalogProductSize>
}
