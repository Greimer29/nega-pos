import { AccountSchema } from '#database/schema'
import Expense from '#models/expense'
import MachineExpense from '#models/machine_expense'
import Purchase from '#models/purchase'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Account extends AccountSchema {
  static table = 'accounts'

  @hasMany(() => Purchase)
  declare purchases: HasMany<typeof Purchase>

  @hasMany(() => Expense)
  declare expenses: HasMany<typeof Expense>

  @hasMany(() => MachineExpense)
  declare machineExpenses: HasMany<typeof MachineExpense>
}
