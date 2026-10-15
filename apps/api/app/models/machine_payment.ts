import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Account from '#models/account'
import Machine from '#models/machine'

export default class MachinePayment extends BaseModel {
  static table = 'machine_payments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare machineId: number

  @column()
  declare accountId: number | null

  @column()
  declare amountUsd: string

  @column()
  declare currencyCode: string | null

  @column()
  declare entryRate: string | null

  @column()
  declare amountNative: string | null

  @column.date()
  declare date: DateTime

  @column()
  declare note: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Machine)
  declare machine: BelongsTo<typeof Machine>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>
}
