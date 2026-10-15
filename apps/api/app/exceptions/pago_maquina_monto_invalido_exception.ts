import { Exception } from '@adonisjs/core/exceptions'

export default class PagoMaquinaMontoInvalidoException extends Exception {
  static status = 422
  static code = 'PAGO_MAQUINA_MONTO_INVALIDO'
  static message = 'Indicá un monto de abono válido'
}
