import { Exception } from '@adonisjs/core/exceptions'

export default class PagoClienteMontoInvalidoException extends Exception {
  static status = 422
  static code = 'PAGO_CLIENTE_MONTO_INVALIDO'
  static message = 'Indicá un monto de abono válido'
}
