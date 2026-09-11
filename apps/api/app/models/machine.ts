import { MachineSchema } from '#database/schema'
import Expense from '#models/expense'
import MachineExpense from '#models/machine_expense'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Machine extends MachineSchema {
  static table = 'machines'

  @hasMany(() => Expense)
  declare companyExpenses: HasMany<typeof Expense>

  @hasMany(() => MachineExpense)
  declare expenses: HasMany<typeof MachineExpense>
}
