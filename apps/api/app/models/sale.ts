import { SaleSchema } from '#database/schema'
import Customer from '#models/customer'
import SaleLine from '#models/sale_line'
import PaymentMethod from '#models/payment_method'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Sale extends SaleSchema {
  static table = 'sales'

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @hasMany(() => SaleLine)
  declare saleLines: HasMany<typeof SaleLine>

  @belongsTo(() => PaymentMethod, { foreignKey: 'paymentMethodCode', localKey: 'code' })
  declare paymentMethod: BelongsTo<typeof PaymentMethod>
}
