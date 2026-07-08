import { Exception } from '@adonisjs/core/exceptions'

export default class CustomerNoEncontradoException extends Exception {
  static code = 'CLIENTE_NO_ENCONTRADO'
  static message = 'Customer no encontrado'

  constructor() {
    super(CustomerNoEncontradoException.message, {
      status: 404,
      code: CustomerNoEncontradoException.code,
    })
  }
}
