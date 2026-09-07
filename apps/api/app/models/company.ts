import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export type CompanyStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED'

export default class Company extends BaseModel {
  static connection = 'central'
  static table = 'companies'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare slug: string

  @column()
  declare name: string

  @column({ columnName: 'db_name' })
  declare dbName: string

  @column()
  declare status: CompanyStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
