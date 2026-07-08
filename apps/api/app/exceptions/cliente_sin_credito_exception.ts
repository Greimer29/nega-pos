import { Exception } from '@adonisjs/core/exceptions'

export default class ClienteSinCreditoException extends Exception {
  static status = 422
  static code = 'E_CLIENTE_SIN_CREDITO'

  constructor() {
    super('El cliente no tiene días de crédito configurados')
  }
}
