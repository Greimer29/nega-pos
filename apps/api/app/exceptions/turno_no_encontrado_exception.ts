import { Exception } from '@adonisjs/core/exceptions'

export default class TurnoNoEncontradoException extends Exception {
  static status = 404
  static code = 'TURNO_NO_ENCONTRADO'
  static message = 'Turno no encontrado.'

  constructor() {
    super(TurnoNoEncontradoException.message, {
      status: TurnoNoEncontradoException.status,
      code: TurnoNoEncontradoException.code,
    })
  }
}
