import { ExpenseSchema } from '#database/schema'
import Account from '#models/account'
import Currency from '#models/currency'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Expense extends ExpenseSchema {
  static table = 'expenses'

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => Currency, { foreignKey: 'currencyCode' })
  declare currency: BelongsTo<typeof Currency>
}
