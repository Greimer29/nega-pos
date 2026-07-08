import { Exception } from '@adonisjs/core/exceptions'

export default class PagoClienteExcedeSaldoException extends Exception {
  static status = 422
  static code = 'PAGO_CLIENTE_EXCEDE_SALDO'
  static message = 'El monto del pago supera el saldo pendiente del cliente'
}
