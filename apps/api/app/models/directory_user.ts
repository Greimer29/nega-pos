import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'

export type DirectoryUserRole = 'ADMIN' | 'OPERATOR'

export default class DirectoryUser extends BaseModel {
  static connection = 'central'
  static table = 'directory_users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string | null

  @column({ columnName: 'company_id' })
  declare companyId: number

  @column()
  declare role: DirectoryUserRole

  @column()
  declare active: boolean

  @column({ columnName: 'google_sub' })
  declare googleSub: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  async verifyPassword(plain: string): Promise<boolean> {
    if (!this.password) {
      return false
    }
    return hash.verify(this.password, plain)
  }

  static async hashPassword(plain: string): Promise<string> {
    return hash.make(plain)
  }
}
