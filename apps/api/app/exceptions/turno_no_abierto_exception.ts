import { Exception } from '@adonisjs/core/exceptions'

export default class TurnoNoAbiertoException extends Exception {
  static status = 409
  static code = 'TURNO_NO_ABIERTO'
  static message = 'No hay un turno de ventas abierto. Abrí un turno para confirmar ventas.'

  constructor(message = TurnoNoAbiertoException.message) {
    super(message, {
      status: TurnoNoAbiertoException.status,
      code: TurnoNoAbiertoException.code,
    })
  }
}
