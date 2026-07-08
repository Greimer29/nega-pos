import { PurchaseSchema } from '#database/schema'
import PurchaseItem from '#models/purchase_item'
import Supplier from '#models/supplier'
import Account from '#models/account'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Purchase extends PurchaseSchema {
  static table = 'purchases'

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @hasMany(() => PurchaseItem)
  declare items: HasMany<typeof PurchaseItem>
}
