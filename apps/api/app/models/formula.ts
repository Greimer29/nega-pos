import { FormulaSchema } from '#database/schema'
import CatalogProduct from '#models/catalog_product'
import FormulaMaterial from '#models/formula_material'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Formula extends FormulaSchema {
  static table = 'formulas'

  @hasMany(() => FormulaMaterial)
  declare materials: HasMany<typeof FormulaMaterial>

  @hasMany(() => CatalogProduct)
  declare catalogProducts: HasMany<typeof CatalogProduct>
}
