import { CustomerSchema } from '#database/schema'
import Order from '#models/order'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Customer extends CustomerSchema {
  static table = 'customers'

  @hasMany(() => Order)
  declare orders: HasMany<typeof Order>
}
