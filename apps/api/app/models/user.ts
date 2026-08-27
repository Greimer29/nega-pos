import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { column } from '@adonisjs/lucid/orm'
import type { PermissionKey } from '#permissions/catalog'

/**
 * Lazy hash factory: Ace commands may import this model before the app boots.
 * Passing `hash` directly would capture `undefined` and break password hashing
 * (e.g. `db:bootstrap` / seeders on Railway).
 */
export default class User extends compose(
  UserSchema,
  withAuthFinder(() => hash.use())
) {
  static table = 'users'

  @column({
    prepare: (value: PermissionKey[] | null) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (value: string | PermissionKey[] | null) => {
      if (value === null || value === undefined) {
        return null
      }

      if (typeof value === 'string') {
        return JSON.parse(value) as PermissionKey[]
      }

      return value
    },
  })
  declare permissions: PermissionKey[] | null
}
