import { MachineSchema } from '#database/schema'
import MachineExpense from '#models/machine_expense'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Machine extends MachineSchema {
  static table = 'machines'

  @hasMany(() => MachineExpense)
  declare expenses: HasMany<typeof MachineExpense>
}
