import { FormulaMaterialSchema } from '#database/schema'
import Formula from '#models/formula'
import Material from '#models/material'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class FormulaMaterial extends FormulaMaterialSchema {
  static table = 'formula_materials'

  @belongsTo(() => Formula)
  declare formula: BelongsTo<typeof Formula>

  @belongsTo(() => Material)
  declare material: BelongsTo<typeof Material>
}
