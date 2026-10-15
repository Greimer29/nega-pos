import { Exception } from '@adonisjs/core/exceptions'

export default class PagoProveedorMontoInvalidoException extends Exception {
  static status = 422
  static code = 'PAGO_PROVEEDOR_MONTO_INVALIDO'
  static message = 'Indicá un monto de abono válido'
}
