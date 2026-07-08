import CatalogProduct from '#models/catalog_product'
import Order from '#models/order'
import PurchaseItem from '#models/purchase_item'
import Sale from '#models/sale'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export type ProductMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'MANUAL_ADJUSTMENT'
  | 'MANUAL_CARGO'
  | 'MANUAL_DESCARGO'
  | 'REVERSAL_ADJUSTMENT'

export default class ProductInventoryMovement extends BaseModel {
  static table = 'product_inventory_movements'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare catalogProductId: number

  @column()
  declare type: ProductMovementType

  @column()
  declare quantity: string

  @column()
  declare note: string | null

  @column()
  declare purchaseItemId: number | null

  @column()
  declare orderId: number | null

  @column()
  declare saleId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>

  @belongsTo(() => PurchaseItem)
  declare purchaseItem: BelongsTo<typeof PurchaseItem>

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => Sale)
  declare sale: BelongsTo<typeof Sale>
}
