import Supplier from '#models/supplier'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/** Valores ya normalizados (RIF sin guiones; tel E.164). La normalización en runtime queda en PR suppliers-api. */
const CASTILLO_RIF = 'J123456789'
const CASTILLO_TELEFONO = '+584128332238'

export default class extends BaseSeeder {
  async run() {
    await Supplier.updateOrCreate(
      { name: 'El Castillo' },
      {
        rif: CASTILLO_RIF,
        phone: CASTILLO_TELEFONO,
        email: null,
        notes: 'Supplier principal — RIF de ejemplo para dev; reemplazar con el real del dueño',
        active: true,
      }
    )
  }
}
