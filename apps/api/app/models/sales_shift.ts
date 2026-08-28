import { SalesShiftSchema } from '#database/schema'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export type SalesShiftStatus = 'OPEN' | 'CLOSED'

export default class SalesShift extends SalesShiftSchema {
  static table = 'sales_shifts'

  @belongsTo(() => User, { foreignKey: 'openedByUserId' })
  declare openedByUser: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'closedByUserId' })
  declare closedByUser: BelongsTo<typeof User>
}
