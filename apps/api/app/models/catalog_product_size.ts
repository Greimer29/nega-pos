import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import CatalogProduct from '#models/catalog_product'

export default class CatalogProductSize extends BaseModel {
  static table = 'catalog_product_sizes'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'catalog_product_id' })
  declare catalogProductId: number

  @column()
  declare size: string

  @column({ columnName: 'stock_quantity' })
  declare stockQuantity: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>
}
