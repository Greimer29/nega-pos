import { SaleLineSchema } from '#database/schema'
import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Material from '#models/material'
import Sale from '#models/sale'
import SaleLineMaterial from '#models/sale_line_material'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class SaleLine extends SaleLineSchema {
  static table = 'sale_lines'

  @belongsTo(() => Sale)
  declare sale: BelongsTo<typeof Sale>

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>

  @belongsTo(() => CatalogProductSize)
  declare catalogProductSize: BelongsTo<typeof CatalogProductSize>

  @belongsTo(() => Material)
  declare material: BelongsTo<typeof Material>

  @hasMany(() => SaleLineMaterial)
  declare saleLineMaterials: HasMany<typeof SaleLineMaterial>
}
