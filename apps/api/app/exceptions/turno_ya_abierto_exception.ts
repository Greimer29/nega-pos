import { Exception } from '@adonisjs/core/exceptions'

export default class TurnoYaAbiertoException extends Exception {
  static status = 409
  static code = 'TURNO_YA_ABIERTO'
  static message = 'Ya hay un turno de ventas abierto. Cerralo antes de abrir uno nuevo.'

  constructor() {
    super(TurnoYaAbiertoException.message, {
      status: TurnoYaAbiertoException.status,
      code: TurnoYaAbiertoException.code,
    })
  }
}
