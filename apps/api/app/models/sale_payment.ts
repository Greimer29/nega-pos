import PaymentMethod from '#models/payment_method'
import Sale from '#models/sale'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SalePayment extends BaseModel {
  static table = 'sale_payments'

  @column({ isPrimary: true })
  declare id: bigint | number

  @column()
  declare saleId: bigint | number

  @column()
  declare paymentMethodCode: string

  @column()
  declare amountUsd: string

  @column()
  declare currencyCode: string

  @column()
  declare usdRate: string | null

  @column()
  declare amountNative: string | null

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Sale)
  declare sale: BelongsTo<typeof Sale>

  @belongsTo(() => PaymentMethod, { foreignKey: 'paymentMethodCode', localKey: 'code' })
  declare paymentMethod: BelongsTo<typeof PaymentMethod>
}
