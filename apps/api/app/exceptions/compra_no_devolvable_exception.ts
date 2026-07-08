import { Exception } from '@adonisjs/core/exceptions'

export default class PurchaseNoDevolvableException extends Exception {
  static code = 'PURCHASE_NOT_RETURNABLE'
  static message = 'La compra no puede devolverse en su estado actual'
  static status = 422
}
