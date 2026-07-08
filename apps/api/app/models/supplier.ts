import { SupplierSchema } from '#database/schema'
import Purchase from '#models/purchase'
import MachineExpense from '#models/machine_expense'
import Material from '#models/material'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Supplier extends SupplierSchema {
  static table = 'suppliers'

  @hasMany(() => Purchase)
  declare purchases: HasMany<typeof Purchase>

  @hasMany(() => Material, {
    foreignKey: 'defaultSupplierId',
  })
  declare materialsHabituales: HasMany<typeof Material>

  @hasMany(() => MachineExpense)
  declare expensesMachine: HasMany<typeof MachineExpense>
}
