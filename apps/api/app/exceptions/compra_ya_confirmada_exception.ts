import { Exception } from '@adonisjs/core/exceptions'

export default class PurchaseYaConfirmadaException extends Exception {
  static status = 409
  static code = 'COMPRA_YA_CONFIRMED'
  static message = 'La purchase ya está confirmada'
}
