import { Exception } from '@adonisjs/core/exceptions'

export default class CuentaNoEncontradaException extends Exception {
  static code = 'CUENTA_NO_ENCONTRADA'
  static message = 'Cuenta no encontrada'

  constructor() {
    super(CuentaNoEncontradaException.message, {
      status: 404,
      code: CuentaNoEncontradaException.code,
    })
  }
}
