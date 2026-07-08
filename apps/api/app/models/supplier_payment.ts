import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Supplier from '#models/supplier'
import Purchase from '#models/purchase'
import Account from '#models/account'

export default class SupplierPayment extends BaseModel {
  static table = 'supplier_payments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare supplierId: number

  @column()
  declare purchaseId: number | null

  @column()
  declare accountId: number | null

  @column()
  declare amountUsd: string

  @column.date()
  declare date: DateTime

  @column()
  declare note: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>

  @belongsTo(() => Purchase)
  declare purchase: BelongsTo<typeof Purchase>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>
}
