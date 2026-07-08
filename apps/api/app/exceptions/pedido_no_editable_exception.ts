import { Exception } from '@adonisjs/core/exceptions'

export default class OrderNoEditableException extends Exception {
  static status = 409
  static code = 'PEDIDO_NO_EDITABLE'
  static message = 'Solo se pueden modificar orders en status DRAFT'
}
