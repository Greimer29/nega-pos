import { Exception } from '@adonisjs/core/exceptions'

export default class VentaNoEditableException extends Exception {
  static status = 409
  static code = 'VENTA_NO_EDITABLE'
  static message = 'Solo se pueden editar facturas en borrador.'
}
