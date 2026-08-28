import { Exception } from '@adonisjs/core/exceptions'

export default class TurnoYaCerradoException extends Exception {
  static status = 409
  static code = 'TURNO_YA_CERRADO'
  static message = 'El turno ya está cerrado.'

  constructor() {
    super(TurnoYaCerradoException.message, {
      status: TurnoYaCerradoException.status,
      code: TurnoYaCerradoException.code,
    })
  }
}
