import { Exception } from '@adonisjs/core/exceptions'

export default class PurchaseNoEditableException extends Exception {
  static status = 409
  static code = 'COMPRA_NO_EDITABLE'
  static message = 'Solo se pueden modificar purchases en status DRAFT'
}
