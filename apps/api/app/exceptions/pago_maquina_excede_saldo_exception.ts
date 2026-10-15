import { Exception } from '@adonisjs/core/exceptions'

export default class PagoMaquinaExcedeSaldoException extends Exception {
  static status = 422
  static code = 'PAGO_MAQUINA_EXCEDE_SALDO'
  static message = 'El monto del abono supera el saldo pendiente de la máquina'
}
