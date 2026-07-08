import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Customer from '#models/customer'
import Order from '#models/order'
import Sale from '#models/sale'
import Account from '#models/account'

export default class CustomerPayment extends BaseModel {
  static table = 'customer_payments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare customerId: number

  @column()
  declare orderId: number | null

  @column()
  declare saleId: number | null

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

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => Sale)
  declare sale: BelongsTo<typeof Sale>

  @belongsTo(() => Account)
  declare account: BelongsTo<typeof Account>
}
