import { Exception } from '@adonisjs/core/exceptions'

export default class TransicionInvalidaException extends Exception {
  static status = 409
  static code = 'TRANSICION_INVALIDA'

  constructor(statusActual: string, nuevoEstado: string) {
    super(`No se puede pasar de ${statusActual} a ${nuevoEstado}`, {
      status: TransicionInvalidaException.status,
      code: TransicionInvalidaException.code,
    })
  }
}
