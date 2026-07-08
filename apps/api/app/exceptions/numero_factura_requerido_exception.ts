import { Exception } from '@adonisjs/core/exceptions'

export default class NumeroFacturaRequeridoException extends Exception {
  static status = 422
  static code = 'NUMERO_FACTURA_REQUERIDO'
  static message = 'El número de factura es obligatorio para confirmar la purchase'
}
