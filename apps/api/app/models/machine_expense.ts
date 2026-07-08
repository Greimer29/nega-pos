import { MachineExpenseSchema } from '#database/schema'
import Machine from '#models/machine'
import Supplier from '#models/supplier'
import Account from '#models/account'
import Currency from '#models/currency'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class MachineExpense extends MachineExpenseSchema {
  static table = 'machine_expenses'

  @belongsTo(() => Machine)
  declare machine: BelongsTo<typeof Machine>

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>

  @belongsTo(() => Currency, { foreignKey: 'currencyCode' })
  declare currency: BelongsTo<typeof Currency>
}
