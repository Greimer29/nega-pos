import { SaleLineSchema } from '#database/schema'
import CatalogProduct from '#models/catalog_product'
import Material from '#models/material'
import Sale from '#models/sale'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SaleLine extends SaleLineSchema {
  static table = 'sale_lines'

  @belongsTo(() => Sale)
  declare sale: BelongsTo<typeof Sale>

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>

  @belongsTo(() => Material)
  declare material: BelongsTo<typeof Material>
}
