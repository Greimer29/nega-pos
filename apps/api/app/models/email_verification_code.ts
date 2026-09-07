import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export type EmailVerificationPurpose = 'COMPANY_CREATE' | 'LOGIN_OTP'

export default class EmailVerificationCode extends BaseModel {
  static connection = 'central'
  static table = 'email_verification_codes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare code: string

  @column()
  declare purpose: EmailVerificationPurpose

  @column({
    prepare: (value: Record<string, unknown> | null) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (value: string | Record<string, unknown> | null) => {
      if (value === null || value === undefined) {
        return null
      }
      if (typeof value === 'string') {
        return JSON.parse(value) as Record<string, unknown>
      }
      return value
    },
  })
  declare payload: Record<string, unknown> | null

  @column.dateTime({ columnName: 'expires_at' })
  declare expiresAt: DateTime

  @column.dateTime({ columnName: 'consumed_at' })
  declare consumedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
