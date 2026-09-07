import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'

export default class PlatformAdmin extends BaseModel {
  static connection = 'central'
  static table = 'platform_admins'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare name: string

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  async verifyPassword(plain: string): Promise<boolean> {
    return hash.verify(this.password, plain)
  }

  static async hashPassword(plain: string): Promise<string> {
    return hash.make(plain)
  }
}
