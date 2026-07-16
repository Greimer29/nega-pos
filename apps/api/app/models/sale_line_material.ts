import Material from '#models/material'
import SaleLine from '#models/sale_line'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SaleLineMaterial extends BaseModel {
  static table = 'sale_line_materials'

  @column({ isPrimary: true })
  declare id: bigint | number

  @column()
  declare saleLineId: bigint | number

  @column()
  declare materialId: bigint | number

  @column()
  declare quantityPerUnit: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => SaleLine)
  declare saleLine: BelongsTo<typeof SaleLine>

  @belongsTo(() => Material)
  declare material: BelongsTo<typeof Material>
}
